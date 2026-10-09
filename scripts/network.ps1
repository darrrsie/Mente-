param(
    [ValidateSet('Check', 'Configure', 'Remove')][string]$Action = 'Check',
    [ValidateRange(1, 65535)][int]$Port = 8765,
    [string]$InterfaceAlias = 'Wi-Fi'
)
$ErrorActionPreference = 'Stop'
$ruleName = "Mente-Movimento-LAN-$Port"
$nodePath = (Get-Command node.exe).Source
$profile = Get-NetConnectionProfile -InterfaceAlias $InterfaceAlias
$addresses = @(Get-NetIPAddress -InterfaceAlias $InterfaceAlias -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '169.254.*' })
if (-not $addresses) { throw 'A interface escolhida nao tem IPv4 utilizavel. Conecte o computador a rede local.' }

if ($Action -ne 'Check') {
    $principal = [Security.Principal.WindowsPrincipal]::new([Security.Principal.WindowsIdentity]::GetCurrent())
    if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        throw 'Esta operacao exige PowerShell como administrador. O firewall nao foi alterado.'
    }
    if ($Action -eq 'Remove') {
        Get-NetFirewallRule -Name $ruleName -ErrorAction SilentlyContinue | Remove-NetFirewallRule
        Write-Output 'Regra do projeto removida.'
        exit
    }
    if ($profile.NetworkCategory -ne 'Private') {
        throw 'A rede atual nao e privada. Somente se for sua rede de confianca, escolha Perfil de rede privada nas propriedades do Wi-Fi do Windows e execute novamente. Nao altere redes publicas para privadas.'
    }
    # Public blocking rules are deliberately preserved. Only this port, program,
    # interface and directly connected subnet may receive inbound traffic.
    if (Get-NetFirewallRule -Name $ruleName -ErrorAction SilentlyContinue) {
        Remove-NetFirewallRule -Name $ruleName
    }
    New-NetFirewallRule -Name $ruleName -DisplayName "Mente & Movimento - LAN TCP $Port" `
        -Direction Inbound -Action Allow -Enabled True -Profile Private `
        -Protocol TCP -LocalPort $Port -Program $nodePath `
        -InterfaceAlias $InterfaceAlias -LocalAddress $addresses.IPAddress `
        -RemoteAddress LocalSubnet -EdgeTraversalPolicy Block | Out-Null
    Write-Output 'Regra restrita criada. O firewall continua ativo.'
}

Write-Output "Interface: $InterfaceAlias; perfil: $($profile.NetworkCategory); programa: $nodePath"
foreach ($address in $addresses) { Write-Output "Endereco do celular: http://$($address.IPAddress):$Port" }
$listeners = @(Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue)
if (-not $listeners) { Write-Output 'Servidor parado. Execute npm run dev e mantenha-o aberto.' }
else { $listeners | Format-Table LocalAddress, LocalPort, OwningProcess }
Get-NetFirewallProfile | Format-Table Name, Enabled
Get-NetFirewallApplicationFilter -Program $nodePath -ErrorAction SilentlyContinue |
    Get-NetFirewallRule | Format-Table DisplayName, Enabled, Profile, Direction, Action
if ($profile.NetworkCategory -eq 'Public') {
    Write-Output 'Perfil publico: a regra privada do projeto nao se aplica. Nao desative o firewall.'
}
Write-Output 'No celular use a mesma rede, http:// e a porta acima. Redes de convidados ou isolamento de clientes no roteador podem impedir acesso entre aparelhos.'
