<#
  Oficina 202 - Coletor de diagnóstico (versão 0.1)

  O QUE FAZ:   lê informações do computador e gera um relatório em HTML (e JSON) na pasta "relatorios".
  O QUE NÃO FAZ: não altera NADA no computador, não instala nada e NÃO ENVIA nada pela internet.
  PRIVACIDADE: o relatório não inclui nome do computador, usuário, números de série, IP nem MAC.
  DICA:        executar como administrador libera mais dados (SMART do disco, temperatura da placa-mãe).

  Este arquivo é texto puro: você pode abrir e conferir cada linha antes de executar.
#>
param([switch]$NaoAbrir)
$ErrorActionPreference = 'SilentlyContinue'
$ProgressPreference = 'SilentlyContinue'
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}

$Versao = '0.1'
$agora = Get-Date
$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
$isAdmin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

$findings = New-Object System.Collections.ArrayList
function Add-F($nivel, $area, $titulo, $explica, $acao) {
  [void]$findings.Add([pscustomobject]@{ nivel = $nivel; area = $area; titulo = $titulo; explicacao = $explica; acao = $acao })
}
function Etapa($t) { Write-Host "  > $t" -ForegroundColor Cyan }
function Esc($s) { [System.Net.WebUtility]::HtmlEncode([string]$s) }
function GB($bytes) { [math]::Round($bytes / 1GB, 1) }

Write-Host ''
Write-Host "  Oficina 202 - Diagnóstico do computador (v$Versao)" -ForegroundColor White
Write-Host '  Somente leitura. Nada é alterado e nada é enviado pela internet.' -ForegroundColor DarkGray
if (-not $isAdmin) { Write-Host '  Dica: como administrador o relatório fica mais completo.' -ForegroundColor DarkYellow }
Write-Host ''

# ---------------- Sistema ----------------
Etapa 'Sistema e placa-mãe'
$os = Get-CimInstance Win32_OperatingSystem
$cs = Get-CimInstance Win32_ComputerSystem
$bios = Get-CimInstance Win32_BIOS
$bb = Get-CimInstance Win32_BaseBoard
$enc = Get-CimInstance Win32_SystemEnclosure
$bat = @(Get-CimInstance Win32_Battery)
$laptopTypes = @(8, 9, 10, 14, 30, 31, 32)
$ehNotebook = ($bat.Count -gt 0) -or [bool](@(@($enc.ChassisTypes) | Where-Object { $laptopTypes -contains $_ }).Count)
$uptime = $agora - $os.LastBootUpTime

$sistema = [ordered]@{
  tipo        = $(if ($ehNotebook) { 'Notebook' } else { 'Desktop' })
  fabricante  = $cs.Manufacturer
  modelo      = $cs.Model
  placaMae    = ('{0} {1}' -f $bb.Manufacturer, $bb.Product).Trim()
  windows     = $os.Caption
  versao      = $os.Version
  uptimeDias  = [math]::Round($uptime.TotalDays, 1)
}

if ($uptime.TotalDays -gt 14) {
  Add-F 'info' 'Sistema' ('Computador ligado há {0:N0} dias sem reiniciar' -f $uptime.TotalDays) 'Ficar muito tempo sem reiniciar acumula pequenos problemas e adia atualizações que só terminam ao reiniciar.' 'Reinicie o computador (reiniciar, não apenas desligar).'
}

# ---------------- Processador ----------------
Etapa 'Processador'
$cpu = Get-CimInstance Win32_Processor | Select-Object -First 1
$cpuInfo = [ordered]@{
  nome     = ($cpu.Name -replace '\s+', ' ').Trim()
  nucleos  = $cpu.NumberOfCores
  threads  = $cpu.NumberOfLogicalProcessors
  maxMHz   = $cpu.MaxClockSpeed
  usoAgora = $cpu.LoadPercentage
}

# ---------------- Temperaturas ----------------
Etapa 'Temperaturas'
$temps = @()
$zonas = @(Get-CimInstance -Namespace root/wmi -ClassName MSAcpi_ThermalZoneTemperature)
foreach ($z in $zonas) {
  $c = [math]::Round(($z.CurrentTemperature / 10) - 273.15, 0)
  if ($c -gt 0 -and $c -lt 130) { $temps += [pscustomobject]@{ sensor = 'Placa-mãe (zona térmica ACPI)'; celsius = $c } }
}
$nvsmi = (Get-Command nvidia-smi -ErrorAction SilentlyContinue).Source
if (-not $nvsmi) {
  foreach ($p in @("$env:ProgramFiles\NVIDIA Corporation\NVSMI\nvidia-smi.exe", "$env:SystemRoot\System32\nvidia-smi.exe")) { if (Test-Path $p) { $nvsmi = $p; break } }
}
if ($nvsmi) {
  $linha = (& $nvsmi --query-gpu=name,temperature.gpu --format=csv,noheader,nounits 2>$null | Select-Object -First 1)
  if ($linha -match '^(.+),\s*(\d+)\s*$') { $temps += [pscustomobject]@{ sensor = ('Placa de vídeo NVIDIA ({0})' -f $Matches[1].Trim()); celsius = [int]$Matches[2] } }
}
foreach ($t in $temps) {
  if ($t.celsius -ge 90) { Add-F 'problema' 'Temperatura' ('{0}: {1} °C (muito alta)' -f $t.sensor, $t.celsius) 'Temperaturas muito altas fazem o computador reduzir a velocidade para se proteger e podem encurtar a vida das peças.' 'Verifique poeira, ventoinhas e pasta térmica. A limpeza interna costuma resolver; se não se sentir seguro para abrir o equipamento, leve a uma assistência de confiança.' }
  elseif ($t.celsius -ge 80) { Add-F 'atencao' 'Temperatura' ('{0}: {1} °C (alta)' -f $t.sensor, $t.celsius) 'Temperatura acima do ideal, mesmo que ainda não seja crítica. Pode indicar acúmulo de poeira ou ventilação ruim.' 'Limpe as entradas de ar e confira se as ventoinhas giram.' }
  else { Add-F 'ok' 'Temperatura' ('{0}: {1} °C' -f $t.sensor, $t.celsius) 'Temperatura dentro do esperado no momento da leitura.' '' }
}
if ($temps.Count -eq 0) {
  Add-F 'info' 'Temperatura' 'Temperatura do processador não pôde ser lida' 'O Windows não expõe a temperatura do processador sem uma ferramenta adicional. É uma limitação do método, e não indica problema.' 'Para medir com precisão sob uso real, use um programa de monitoramento (como HWiNFO ou HWMonitor) durante um jogo ou teste de estresse.'
}

# ---------------- Memória RAM ----------------
Etapa 'Memória RAM'
$mem = @(Get-CimInstance Win32_PhysicalMemory)
$tipoMem = @{ 20 = 'DDR'; 21 = 'DDR2'; 24 = 'DDR3'; 26 = 'DDR4'; 34 = 'DDR5' }
$ramMods = @()
foreach ($m in $mem) {
  $ramMods += [pscustomobject]@{
    slot        = $m.DeviceLocator
    tipo        = $(if ($tipoMem.ContainsKey([int]$m.SMBIOSMemoryType)) { $tipoMem[[int]$m.SMBIOSMemoryType] } else { 'desconhecido' })
    capacidadeGB = GB $m.Capacity
    velocidadeModulo = $m.Speed
    velocidadeAtual  = $m.ConfiguredClockSpeed
    fabricante  = ($m.Manufacturer -replace '\s+', ' ').Trim()
    modelo      = ($m.PartNumber -replace '\s+', ' ').Trim()
  }
}
$ramTotal = [math]::Round((($mem | Measure-Object Capacity -Sum).Sum) / 1GB)
$ramLivreGB = [math]::Round($os.FreePhysicalMemory / 1MB, 1)
$ramInfo = [ordered]@{ totalGB = $ramTotal; livreAgoraGB = $ramLivreGB; modulos = $ramMods.Count }

$lentos = @($ramMods | Where-Object { $_.velocidadeModulo -gt 0 -and $_.velocidadeAtual -gt 0 -and $_.velocidadeAtual -lt $_.velocidadeModulo })
if ($lentos.Count -gt 0) {
  $l = $lentos[0]
  Add-F 'atencao' 'Memória RAM' ('Memória rodando a {0} MT/s, mas o módulo indica {1} MT/s' -f $l.velocidadeAtual, $l.velocidadeModulo) 'Memórias costumam vir de fábrica numa velocidade segura e só chegam à velocidade anunciada quando o perfil XMP (Intel) ou EXPO/DOCP (AMD) é ativado na BIOS. Você pode estar pagando por desempenho que não está usando.' 'Ative o XMP/EXPO na BIOS (menu de memória ou "Overclock") e teste se o computador continua estável.'
}
elseif ($ramMods.Count -gt 0 -and $ramMods[0].velocidadeAtual -gt 0) {
  Add-F 'ok' 'Memória RAM' ('Memória na velocidade esperada ({0} MT/s)' -f $ramMods[0].velocidadeAtual) 'A velocidade atual da memória acompanha a velocidade do módulo.' ''
}
if ($ramTotal -lt 8) { Add-F 'atencao' 'Memória RAM' ('Pouca memória RAM: {0} GB' -f $ramTotal) 'Com menos de 8 GB, o Windows e navegadores modernos já ficam apertados e o computador fica lento.' 'Considere aumentar para 16 GB, se o equipamento permitir.' }
elseif ($ramTotal -lt 16) { Add-F 'info' 'Memória RAM' ('{0} GB de RAM' -f $ramTotal) 'Atende uso básico. Para jogos recentes, edição de vídeo ou muitas abas e programas abertos, 16 GB ou mais é o recomendado.' 'Se sentir lentidão ao abrir muita coisa, vale um upgrade para 16 GB.' }
if ($mem.Count -eq 1 -and -not $ehNotebook) {
  Add-F 'info' 'Memória RAM' 'Apenas um pente de memória instalado' 'Com dois pentes iguais, a memória trabalha em dual channel (canal duplo), o que melhora o desempenho, principalmente em jogos e vídeo integrado.' 'Ao fazer upgrade, prefira um kit de dois pentes.'
}

# ---------------- Placa de vídeo ----------------
Etapa 'Placa de vídeo'
$gpus = @(Get-CimInstance Win32_VideoController)
$gpuList = @()
foreach ($g in $gpus) {
  $dataDrv = $g.DriverDate
  $idade = if ($dataDrv) { [math]::Round(($agora - $dataDrv).TotalDays / 30.4, 0) } else { $null }
  $gpuList += [pscustomobject]@{ nome = $g.Name; versaoDriver = $g.DriverVersion; dataDriver = $(if ($dataDrv) { $dataDrv.ToString('yyyy-MM-dd') } else { '' }); idadeDriverMeses = $idade }
  if ($g.Name -match 'Basic Display|Básico') {
    Add-F 'problema' 'Placa de vídeo' 'Driver de vídeo genérico do Windows' 'O Windows está usando um driver básico, sem aceleração. Jogos, vídeos e até a interface ficam lentos.' 'Instale o driver oficial do fabricante da placa de vídeo (NVIDIA, AMD ou Intel).'
  }
  elseif ($g.Name -match 'NVIDIA|AMD|Radeon|GeForce|Intel|Arc' -and $idade -ne $null -and $idade -gt 12) {
    Add-F 'atencao' 'Placa de vídeo' ('Driver de vídeo com {0} meses ({1})' -f $idade, $g.Name) 'Drivers de vídeo recebem correções de desempenho e estabilidade com frequência, principalmente para jogos novos.' 'Baixe a versão mais recente no site do fabricante da placa.'
  }
  elseif ($g.Name -match 'NVIDIA|AMD|Radeon|GeForce|Intel|Arc' -and $idade -ne $null) {
    Add-F 'ok' 'Placa de vídeo' ('Driver de vídeo recente ({0})' -f $g.Name) ('Driver com cerca de {0} meses.' -f $idade) ''
  }
}

# ---------------- BIOS ----------------
Etapa 'BIOS'
$biosData = if ($bios.ReleaseDate) { $bios.ReleaseDate } else { $null }
$biosInfo = [ordered]@{ fabricante = $bios.Manufacturer; versao = $bios.SMBIOSBIOSVersion; data = $(if ($biosData) { $biosData.ToString('yyyy-MM-dd') } else { '' }) }
if ($biosData) {
  $anos = [math]::Round(($agora - $biosData).TotalDays / 365.25, 1)
  if ($anos -ge 2) { Add-F 'info' 'BIOS' ('BIOS de {0} (com {1} anos)' -f $biosData.ToString('MM/yyyy'), $anos) 'A BIOS é o programa básico da placa-mãe. Atualizações trazem compatibilidade com memórias e processadores novos e correções de segurança e estabilidade. Atualizar sem necessidade tem risco, então só se faz com motivo.' ('Confira no site do fabricante ({0}) se há versão nova para o modelo {1}.' -f $(if ($bb.Manufacturer) { $bb.Manufacturer } else { $cs.Manufacturer }), $(if ($bb.Product) { $bb.Product } else { $cs.Model }))
  }
  else { Add-F 'ok' 'BIOS' ('BIOS relativamente recente ({0})' -f $biosData.ToString('MM/yyyy')) 'Não há motivo para se preocupar com a BIOS agora.' '' }
}

# ---------------- Armazenamento ----------------
Etapa 'Discos (SSD/HD)'
$discos = @()
$pds = @(Get-PhysicalDisk)
$discoSistema = $null
$partC = Get-Partition -DriveLetter C
if ($partC) { $discoSistema = [string]$partC.DiskNumber }
foreach ($pd in $pds) {
  $r = $pd | Get-StorageReliabilityCounter
  $d = [pscustomobject]@{
    nome = $pd.FriendlyName; tipo = [string]$pd.MediaType; interface = [string]$pd.BusType; tamanhoGB = GB $pd.Size
    saude = [string]$pd.HealthStatus; desgastePct = $(if ($r) { $r.Wear } else { $null }); tempC = $(if ($r) { $r.Temperature } else { $null })
    horasLigado = $(if ($r) { $r.PowerOnHours } else { $null }); sistema = ([string]$pd.DeviceId -eq $discoSistema)
  }
  $discos += $d
  if ($d.saude -and $d.saude -ne 'Healthy') { Add-F 'problema' 'Disco' ('Disco {0} reporta saúde: {1}' -f $d.nome, $d.saude) 'O próprio disco informa que há algo errado. Há risco de perda de dados.' 'Faça backup dos arquivos importantes AGORA e leve o disco a uma assistência de confiança.' }
  elseif ($d.desgastePct -ne $null -and $d.desgastePct -ge 80) { Add-F 'atencao' 'Disco' ('SSD {0} com {1}% de desgaste' -f $d.nome, $d.desgastePct) 'SSDs têm vida útil limitada por quantidade de gravações. Perto do limite, a chance de falha aumenta.' 'Faça backup e planeje a troca.' }
  elseif ($d.tempC -ne $null -and $d.tempC -ge 65) { Add-F 'atencao' 'Disco' ('Disco {0} a {1} °C' -f $d.nome, $d.tempC) 'Temperatura alta para um disco, o que reduz a vida útil e pode limitar a velocidade.' 'Melhore a ventilação do gabinete.' }
  elseif ($d.saude -eq 'Healthy') { Add-F 'ok' 'Disco' ('Disco {0} reporta saúde normal' -f $d.nome) 'O disco informa estar saudável.' '' }
  if ($d.sistema -and $d.tipo -eq 'HDD') { Add-F 'atencao' 'Disco' 'O Windows está instalado em um HD mecânico' 'HDs são muito mais lentos que SSDs. Trocar por um SSD costuma ser o upgrade que mais melhora a sensação de velocidade do computador.' 'Considere instalar o sistema em um SSD.' }
}
$volumes = @()
foreach ($v in @(Get-Volume | Where-Object { $_.DriveType -eq 'Fixed' -and $_.DriveLetter })) {
  $pctLivre = if ($v.Size -gt 0) { [math]::Round(100 * $v.SizeRemaining / $v.Size, 0) } else { 0 }
  $volumes += [pscustomobject]@{ unidade = ('{0}:' -f $v.DriveLetter); tamanhoGB = GB $v.Size; livreGB = GB $v.SizeRemaining; livrePct = $pctLivre }
  if ($pctLivre -lt 5) { Add-F 'problema' 'Disco' ('Unidade {0}: só {1}% livre' -f $v.DriveLetter, $pctLivre) 'Disco quase cheio deixa o Windows lento, impede atualizações e pode causar travamentos.' 'Libere espaço (arquivos grandes, downloads, programas sem uso).' }
  elseif ($pctLivre -lt 10) { Add-F 'atencao' 'Disco' ('Unidade {0}: apenas {1}% livre' -f $v.DriveLetter, $pctLivre) 'Com pouco espaço livre o desempenho começa a cair.' 'Libere espaço ou use um disco maior.' }
}

# ---------------- Drivers ----------------
Etapa 'Drivers e dispositivos'
$comErro = @(Get-CimInstance Win32_PnPEntity | Where-Object { $_.ConfigManagerErrorCode -gt 0 -and $_.ConfigManagerErrorCode -ne 22 })
foreach ($e in $comErro | Select-Object -First 8) {
  Add-F 'problema' 'Drivers' ('Dispositivo com erro: {0}' -f $e.Name) ('O Windows reporta falha neste dispositivo (código {0}). Normalmente é driver ausente, corrompido ou incompatível.' -f $e.ConfigManagerErrorCode) 'Instale ou reinstale o driver do fabricante deste dispositivo.'
}
if ($comErro.Count -eq 0) { Add-F 'ok' 'Drivers' 'Nenhum dispositivo com erro no Gerenciador de Dispositivos' 'O Windows não reportou falhas em drivers.' '' }
$drvVelhos = @()
$classes = @('DISPLAY', 'NET', 'MEDIA', 'BLUETOOTH', 'HDC', 'USB')
foreach ($d in @(Get-CimInstance Win32_PnPSignedDriver | Where-Object { $classes -contains $_.DeviceClass -and $_.Manufacturer -notmatch 'Microsoft' -and $_.DriverDate })) {
  $m = ($agora - $d.DriverDate).TotalDays / 30.4
  if ($m -gt 36) { $drvVelhos += [pscustomobject]@{ dispositivo = $d.DeviceName; classe = $d.DeviceClass; versao = $d.DriverVersion; data = $d.DriverDate.ToString('yyyy-MM-dd'); idadeMeses = [math]::Round($m, 0) } }
}
$drvVelhos = @($drvVelhos | Sort-Object idadeMeses -Descending | Select-Object -First 15)
if ($drvVelhos.Count -gt 0) {
  Add-F 'info' 'Drivers' ('{0} driver(s) com mais de 3 anos' -f $drvVelhos.Count) 'Driver antigo nem sempre é problema, mas drivers de rede, áudio, Bluetooth e armazenamento muito defasados podem causar instabilidade ou lentidão.' 'Veja a lista nos detalhes e compare com as versões do site do fabricante.'
}

# ---------------- Eventos do Windows (30 dias) ----------------
Etapa 'Histórico de erros do Windows (últimos 30 dias)'
function Get-Ev($filtro) { try { @(Get-WinEvent -FilterHashtable $filtro -ErrorAction Stop) } catch { @() } }
$desde = $agora.AddDays(-30)
$evDeslig = Get-Ev @{ LogName = 'System'; StartTime = $desde; Id = 41, 6008 }
$evBug = Get-Ev @{ LogName = 'System'; StartTime = $desde; Id = 1001; ProviderName = 'Microsoft-Windows-WER-SystemErrorReporting' }
$evWhea = Get-Ev @{ LogName = 'System'; StartTime = $desde; ProviderName = 'Microsoft-Windows-WHEA-Logger' }
$evDisco = Get-Ev @{ LogName = 'System'; StartTime = $desde; ProviderName = 'disk'; Id = 7, 11, 51, 153 }
$evVideo = Get-Ev @{ LogName = 'System'; StartTime = $desde; ProviderName = 'Display'; Id = 4101 }

$nomesBug = @{
  '0x0000000a' = 'IRQL_NOT_LESS_OR_EQUAL (driver ou memória)'; '0x000000d1' = 'DRIVER_IRQL_NOT_LESS_OR_EQUAL (driver)'
  '0x0000001a' = 'MEMORY_MANAGEMENT (memória RAM ou driver)'; '0x0000003b' = 'SYSTEM_SERVICE_EXCEPTION (driver ou software)'
  '0x00000050' = 'PAGE_FAULT_IN_NONPAGED_AREA (memória RAM ou driver)'; '0x0000007e' = 'SYSTEM_THREAD_EXCEPTION_NOT_HANDLED (driver)'
  '0x0000009f' = 'DRIVER_POWER_STATE_FAILURE (driver / energia)'; '0x00000101' = 'CLOCK_WATCHDOG_TIMEOUT (processador)'
  '0x00000116' = 'VIDEO_TDR_FAILURE (placa de vídeo)'; '0x00000117' = 'VIDEO_TDR_TIMEOUT_DETECTED (placa de vídeo)'
  '0x00000124' = 'WHEA_UNCORRECTABLE_ERROR (hardware: processador, memória ou placa-mãe)'; '0x00000133' = 'DPC_WATCHDOG_VIOLATION (driver / armazenamento)'
  '0x0000012b' = 'FAULTY_HARDWARE_CORRUPTED_PAGE (memória RAM)'; '0x000000ef' = 'CRITICAL_PROCESS_DIED'
}
$codigos = @()
foreach ($b in $evBug) { if ($b.Message -match '0x[0-9a-fA-F]{1,16}') { $n = [Convert]::ToInt64($Matches[0], 16); $codigos += ('0x{0:x8}' -f $n) } }
$resumoBug = @($codigos | Group-Object | Sort-Object Count -Descending | ForEach-Object { [pscustomobject]@{ codigo = $_.Name; vezes = $_.Count; significado = $(if ($nomesBug.ContainsKey($_.Name)) { $nomesBug[$_.Name] } else { 'código sem descrição no relatório' }) } })

if ($evBug.Count -gt 0) {
  $top = ($resumoBug | Select-Object -First 3 | ForEach-Object { '{0} ({1}x): {2}' -f $_.codigo, $_.vezes, $_.significado }) -join '; '
  $nv = if ($evBug.Count -ge 3) { 'problema' } else { 'atencao' }
  Add-F $nv 'Estabilidade' ('{0} tela(s) azul(is) nos últimos 30 dias' -f $evBug.Count) ('O Windows registrou travamentos graves. Códigos: {0}. O código indica a área mais provável da causa.' -f $top) 'Atualize drivers (principalmente vídeo), teste a memória RAM e verifique temperaturas. Se persistir, leve a uma assistência de confiança.'
}
if ($evDeslig.Count -gt 0) {
  $nv = if ($evDeslig.Count -ge 3) { 'problema' } else { 'atencao' }
  Add-F $nv 'Estabilidade' ('{0} desligamento(s) inesperado(s) nos últimos 30 dias' -f $evDeslig.Count) 'O computador desligou ou reiniciou sem passar pelo Windows (queda de energia, botão de força, superaquecimento, fonte de alimentação com problema ou travamento total).' 'Se não foram quedas de energia, verifique temperatura e a fonte de alimentação.'
}
if ($evWhea.Count -gt 0) { Add-F 'problema' 'Hardware' ('{0} erro(s) de hardware (WHEA) registrados' -f $evWhea.Count) 'O processador ou a placa-mãe avisaram o Windows sobre erros de hardware. Costuma ocorrer com overclock ou undervolt instável, memória com problema ou peça defeituosa.' 'Desfaça ajustes manuais de desempenho (overclock/undervolt) e faça testes de memória e processador (ex.: MemTest86 e um teste de estresse da CPU).' }
if ($evDisco.Count -gt 0) { Add-F 'problema' 'Disco' ('{0} erro(s) de disco registrados' -f $evDisco.Count) 'O Windows registrou falhas ao ler ou gravar em um disco, sinal clássico de disco com defeito ou cabo/conexão ruim.' 'Faça backup dos arquivos importantes imediatamente e leve o disco a uma assistência de confiança.' }
if ($evVideo.Count -gt 0) { Add-F 'atencao' 'Placa de vídeo' ('Driver de vídeo parou de responder {0} vez(es)' -f $evVideo.Count) 'O Windows precisou reiniciar o driver de vídeo. Causas comuns: driver com problema, placa superaquecendo, overclock instável ou fonte de alimentação no limite.' 'Reinstale o driver de vídeo (instalação limpa), confira a temperatura e desfaça overclocks.' }
if (($evBug.Count + $evDeslig.Count + $evWhea.Count + $evDisco.Count + $evVideo.Count) -eq 0) { Add-F 'ok' 'Estabilidade' 'Sem telas azuis, desligamentos inesperados ou erros de hardware em 30 dias' 'O histórico do Windows está limpo nesse período.' '' }
$eventos = [ordered]@{ telasAzuis = $evBug.Count; desligamentosInesperados = $evDeslig.Count; errosHardwareWHEA = $evWhea.Count; errosDisco = $evDisco.Count; driverVideoReiniciado = $evVideo.Count; codigosTelaAzul = $resumoBug }

# ---------------- Windows: segurança, atualizações, energia ----------------
Etapa 'Segurança, atualizações e energia'
$avs = @(Get-CimInstance -Namespace root/SecurityCenter2 -ClassName AntiVirusProduct)
$def = Get-MpComputerStatus
$segInfo = [ordered]@{ antivirus = @($avs | ForEach-Object { $_.displayName }); defenderAtivo = $(if ($def) { [bool]$def.RealTimeProtectionEnabled } else { $null }); assinaturaDefenderDias = $(if ($def) { $def.AntivirusSignatureAge } else { $null }) }
if ($avs.Count -eq 0 -and $def -and -not $def.RealTimeProtectionEnabled) {
  Add-F 'problema' 'Segurança' 'Nenhuma proteção antivírus ativa' 'Sem antivírus ativo, o computador fica exposto a vírus e golpes.' 'Ative o Microsoft Defender (já incluso no Windows) ou instale um antivírus confiável.'
}
elseif ($def -and $def.AntivirusSignatureAge -gt 7 -and ($avs.Count -le 1)) {
  Add-F 'atencao' 'Segurança' ('Definições do antivírus com {0} dias' -f $def.AntivirusSignatureAge) 'O antivírus precisa das definições atualizadas para reconhecer ameaças novas.' 'Abra a Segurança do Windows e atualize as definições.'
}
else { Add-F 'ok' 'Segurança' 'Proteção antivírus ativa' ('Detectado: {0}.' -f (($avs | ForEach-Object { $_.displayName }) -join ', ')) '' }

$hf = @(Get-HotFix | Where-Object { $_.InstalledOn } | Sort-Object InstalledOn -Descending)
$ultimaAtt = if ($hf.Count -gt 0) { $hf[0].InstalledOn } else { $null }
$segInfo['ultimaAtualizacaoWindows'] = $(if ($ultimaAtt) { $ultimaAtt.ToString('yyyy-MM-dd') } else { '' })
if ($ultimaAtt) {
  $dias = ($agora - $ultimaAtt).TotalDays
  if ($dias -gt 90) { Add-F 'atencao' 'Windows' ('Última atualização do Windows há {0:N0} dias' -f $dias) 'Atualizações trazem correções de segurança e de estabilidade.' 'Abra Configurações > Windows Update e instale as pendentes.' }
  else { Add-F 'ok' 'Windows' 'Windows atualizado recentemente' ('Última atualização há {0:N0} dias.' -f $dias) '' }
}
$pend = (Test-Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Component Based Servicing\RebootPending') -or (Test-Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update\RebootRequired')
if ($pend) { Add-F 'info' 'Windows' 'Reinício pendente para concluir atualizações' 'O Windows instalou algo que só termina após reiniciar.' 'Reinicie o computador.' }

$planoRaw = (powercfg /getactivescheme 2>$null) -join ' '
if ($planoRaw -match 'a1841308-3541-4fab-bc81-f71556f20b4a' -and -not $ehNotebook) {
  Add-F 'atencao' 'Energia' 'Plano de energia em "Economia de energia"' 'Em um desktop, esse plano limita a velocidade do processador sem necessidade.' 'Troque para "Equilibrado" ou "Alto desempenho" em Opções de Energia.'
}
$inic = @(Get-CimInstance Win32_StartupCommand).Count
if ($inic -gt 15) { Add-F 'info' 'Desempenho' ('{0} programas iniciam junto com o Windows' -f $inic) 'Muitos programas na inicialização deixam a partida mais lenta e consomem memória o tempo todo.' 'Abra o Gerenciador de Tarefas > Inicializar e desative o que não precisa.' }

if ($ehNotebook) {
  $proj = Get-CimInstance -Namespace root/wmi -ClassName BatteryStaticData | Select-Object -First 1
  $cheia = Get-CimInstance -Namespace root/wmi -ClassName BatteryFullChargedCapacity | Select-Object -First 1
  if ($proj -and $cheia -and $proj.DesignedCapacity -gt 0) {
    $saudeBat = [math]::Round(100 * $cheia.FullChargedCapacity / $proj.DesignedCapacity, 0)
    $segInfo['saudeBateriaPct'] = $saudeBat
    if ($saudeBat -lt 50) { Add-F 'problema' 'Bateria' ('Bateria com {0}% da capacidade original' -f $saudeBat) 'A bateria está muito desgastada e segura pouca carga.' 'Considere a troca da bateria.' }
    elseif ($saudeBat -lt 75) { Add-F 'atencao' 'Bateria' ('Bateria com {0}% da capacidade original' -f $saudeBat) 'Desgaste normal pelo uso, mas a autonomia já caiu bem.' 'Se a duração incomoda, avalie trocar a bateria.' }
    else { Add-F 'ok' 'Bateria' ('Bateria com {0}% da capacidade original' -f $saudeBat) 'Bateria em bom estado.' '' }
  }
}

# ---------------- Resumo ----------------
$ordem = @{ problema = 0; atencao = 1; info = 2; ok = 3 }
$ordenados = @($findings | Sort-Object { $ordem[$_.nivel] })
$nProb = @($findings | Where-Object { $_.nivel -eq 'problema' }).Count
$nAten = @($findings | Where-Object { $_.nivel -eq 'atencao' }).Count
$nInfo = @($findings | Where-Object { $_.nivel -eq 'info' }).Count
$nOk = @($findings | Where-Object { $_.nivel -eq 'ok' }).Count
if ($nProb -gt 0) { $veredito = 'Encontramos problemas que merecem atenção.' }
elseif ($nAten -gt 0) { $veredito = 'O computador está funcional, com pontos que podem ser melhorados.' }
else { $veredito = 'Nenhum problema encontrado nesta verificação.' }

# ---------------- Relatório JSON ----------------
$pasta = Join-Path $(if ($PSScriptRoot) { $PSScriptRoot } else { [Environment]::GetFolderPath('Desktop') }) 'relatorios'
if (-not (Test-Path $pasta)) { New-Item -ItemType Directory -Path $pasta | Out-Null }
$carimbo = $agora.ToString('yyyy-MM-dd_HH-mm')
$arqHtml = Join-Path $pasta "diagnostico_$carimbo.html"
$arqJson = Join-Path $pasta "diagnostico_$carimbo.json"

$relatorio = [ordered]@{
  versaoColetor = $Versao; geradoEm = $agora.ToString('s'); executouComoAdmin = $isAdmin
  resumo = [ordered]@{ problemas = $nProb; atencao = $nAten; informativos = $nInfo; ok = $nOk; veredito = $veredito }
  sistema = $sistema; processador = $cpuInfo; memoria = $ramInfo; modulosMemoria = $ramMods; placasDeVideo = $gpuList; bios = $biosInfo
  temperaturas = $temps; discos = $discos; volumes = $volumes; driversAntigos = $drvVelhos; eventos30dias = $eventos; seguranca = $segInfo
  achados = $ordenados
}
$utf8 = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($arqJson, ($relatorio | ConvertTo-Json -Depth 8), $utf8)

# ---------------- Relatório HTML ----------------
function Tabela($cabecalhos, $linhas) {
  if (-not $linhas -or @($linhas).Count -eq 0) { return '<p class="vazio">Sem dados.</p>' }
  $s = '<table><thead><tr>' + (($cabecalhos | ForEach-Object { '<th>' + (Esc $_) + '</th>' }) -join '') + '</tr></thead><tbody>'
  foreach ($l in $linhas) { $s += '<tr>' + (($l | ForEach-Object { '<td>' + (Esc $_) + '</td>' }) -join '') + '</tr>' }
  $s + '</tbody></table>'
}
$rotulo = @{ problema = 'Problema'; atencao = 'Atenção'; info = 'Informação'; ok = 'Tudo certo' }
$cards = ''
foreach ($f in $ordenados) {
  $acaoHtml = if ($f.acao) { '<p class="acao"><b>O que fazer:</b> ' + (Esc $f.acao) + '</p>' } else { '' }
  $cards += '<article class="achado ' + $f.nivel + '"><div class="tag">' + $rotulo[$f.nivel] + ' · ' + (Esc $f.area) + '</div><h3>' + (Esc $f.titulo) + '</h3><p>' + (Esc $f.explicacao) + '</p>' + $acaoHtml + '</article>'
}
$tRam = Tabela @('Slot', 'Tipo', 'GB', 'Velocidade do módulo (MT/s)', 'Velocidade atual (MT/s)', 'Fabricante', 'Modelo') ($ramMods | ForEach-Object { , @($_.slot, $_.tipo, $_.capacidadeGB, $_.velocidadeModulo, $_.velocidadeAtual, $_.fabricante, $_.modelo) })
$tGpu = Tabela @('Placa de vídeo', 'Versão do driver', 'Data do driver') ($gpuList | ForEach-Object { , @($_.nome, $_.versaoDriver, $_.dataDriver) })
$tDisco = Tabela @('Disco', 'Tipo', 'Interface', 'GB', 'Saúde', 'Desgaste %', 'Temp °C', 'Horas ligado', 'Sistema') ($discos | ForEach-Object { , @($_.nome, $_.tipo, $_.interface, $_.tamanhoGB, $_.saude, $_.desgastePct, $_.tempC, $_.horasLigado, $(if ($_.sistema) { 'sim' } else { '' })) })
$tVol = Tabela @('Unidade', 'Tamanho GB', 'Livre GB', 'Livre %') ($volumes | ForEach-Object { , @($_.unidade, $_.tamanhoGB, $_.livreGB, $_.livrePct) })
$tDrv = Tabela @('Dispositivo', 'Classe', 'Versão', 'Data', 'Idade (meses)') ($drvVelhos | ForEach-Object { , @($_.dispositivo, $_.classe, $_.versao, $_.data, $_.idadeMeses) })
$tBug = Tabela @('Código', 'Vezes', 'Significado provável') ($resumoBug | ForEach-Object { , @($_.codigo, $_.vezes, $_.significado) })

$html = @"
<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Relatório de diagnóstico</title>
<style>
:root{--navy:#0a0a0a;--blue:#111111;--text:#171717;--muted:#5f5f5f;--line:#e4e4e4;--bg:#f4f4f4}
*{box-sizing:border-box}body{margin:0;font-family:"Segoe UI",system-ui,sans-serif;color:var(--text);background:var(--bg);line-height:1.55}
.wrap{width:min(980px,94%);margin:0 auto;padding:28px 0 60px}
header{background:var(--navy);color:#fff;padding:30px 0}header .wrap{padding:0}
header h1{margin:0 0 4px;font-size:1.7rem}header p{margin:0;color:#bdbdbd}
.veredito{background:#fff;border:1px solid var(--line);border-radius:14px;padding:22px;margin:22px 0}
.veredito h2{margin:0 0 12px;color:var(--navy)}
.placar{display:flex;gap:12px;flex-wrap:wrap}.placar div{flex:1;min-width:120px;border-radius:10px;padding:12px 14px;background:var(--bg)}
.placar b{display:block;font-size:1.7rem}.placar .p b{color:#c0392b}.placar .a b{color:#b9770e}.placar .i b{color:#111111}.placar .o b{color:#1f9d6b}
h2.sec{margin:30px 0 12px;color:var(--navy)}
.achado{background:#fff;border:1px solid var(--line);border-left:6px solid #999;border-radius:10px;padding:14px 18px;margin-bottom:10px}
.achado h3{margin:2px 0 6px;font-size:1.05rem;color:var(--navy)}.achado p{margin:4px 0;color:var(--muted);font-size:.95rem}
.achado .acao{color:var(--text)}.tag{font-size:.74rem;text-transform:uppercase;letter-spacing:.05em;font-weight:700}
.achado.problema{border-left-color:#c0392b}.achado.problema .tag{color:#c0392b}
.achado.atencao{border-left-color:#e0a21a}.achado.atencao .tag{color:#b9770e}
.achado.info{border-left-color:#111111}.achado.info .tag{color:#111111}
.achado.ok{border-left-color:#1f9d6b}.achado.ok .tag{color:#1f9d6b}
details{background:#fff;border:1px solid var(--line);border-radius:10px;margin-bottom:10px;padding:2px 16px}
summary{cursor:pointer;font-weight:600;padding:12px 0;color:var(--navy)}
table{border-collapse:collapse;width:100%;font-size:.88rem;margin:4px 0 14px;display:block;overflow-x:auto}
th,td{text-align:left;padding:7px 10px;border-bottom:1px solid var(--line);white-space:nowrap}th{color:var(--muted);font-weight:600}
.kv{display:grid;grid-template-columns:200px 1fr;gap:4px 14px;font-size:.92rem;padding-bottom:12px}.kv span{color:var(--muted)}
.vazio{color:var(--muted)}
.priv{margin-top:30px;padding:16px;border-radius:10px;background:#efefef;color:#222222;font-size:.9rem}
</style></head><body>
<header><div class="wrap"><h1>Relatório de diagnóstico</h1>
<p>$(Esc $sistema.tipo) · $(Esc $sistema.fabricante) $(Esc $sistema.modelo) · gerado em $($agora.ToString('dd/MM/yyyy HH:mm'))</p></div></header>
<div class="wrap">
<section class="veredito"><h2>$(Esc $veredito)</h2>
<div class="placar"><div class="p"><b>$nProb</b>problema(s)</div><div class="a"><b>$nAten</b>atenção</div><div class="i"><b>$nInfo</b>informação</div><div class="o"><b>$nOk</b>tudo certo</div></div></section>
<h2 class="sec">O que encontramos</h2>
$cards
<h2 class="sec">Detalhes técnicos</h2>
<details><summary>Sistema e processador</summary><div class="kv">
<span>Windows</span><b>$(Esc $sistema.windows) ($(Esc $sistema.versao))</b>
<span>Placa-mãe</span><b>$(Esc $sistema.placaMae)</b>
<span>BIOS</span><b>$(Esc $biosInfo.fabricante) $(Esc $biosInfo.versao) ($(Esc $biosInfo.data))</b>
<span>Processador</span><b>$(Esc $cpuInfo.nome)</b>
<span>Núcleos / threads</span><b>$($cpuInfo.nucleos) / $($cpuInfo.threads) (máx. $($cpuInfo.maxMHz) MHz)</b>
<span>Ligado há</span><b>$($sistema.uptimeDias) dias</b></div></details>
<details><summary>Memória RAM ($ramTotal GB)</summary>$tRam</details>
<details><summary>Placa de vídeo</summary>$tGpu</details>
<details><summary>Discos e espaço livre</summary>$tDisco$tVol</details>
<details><summary>Drivers com mais de 3 anos</summary>$tDrv</details>
<details><summary>Telas azuis (30 dias)</summary>$tBug</details>
<div class="priv"><b>Privacidade:</b> este relatório foi gerado neste computador e não foi enviado para lugar nenhum. Ele não contém nome do computador, usuário, números de série, IP ou MAC. Você escolhe com quem compartilhá-lo. Os mesmos dados estão em formato JSON na pasta <i>relatorios</i>, para quem entende do assunto ou para a ferramenta da Oficina 202 interpretar.<br>
Esta é uma verificação automática: indica probabilidades e pontos de atenção, não substitui o teste na bancada para confirmar a causa de um defeito.$(if (-not $isAdmin) { '<br><b>Observação:</b> executado sem permissão de administrador, então alguns dados (SMART do disco, temperaturas) podem estar ausentes.' })</div>
</div></body></html>
"@
[System.IO.File]::WriteAllText($arqHtml, $html, $utf8)

Write-Host ''
Write-Host "  $veredito" -ForegroundColor White
Write-Host ("  Problemas: {0}  Atenção: {1}  Informação: {2}  Tudo certo: {3}" -f $nProb, $nAten, $nInfo, $nOk)
Write-Host "  Relatório salvo em: $arqHtml" -ForegroundColor Green
if (-not $NaoAbrir) { Start-Process $arqHtml }
