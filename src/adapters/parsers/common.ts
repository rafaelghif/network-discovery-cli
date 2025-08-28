/**
 * Normalizes interface names to a standard format (e.g., 'gi1/0/1' -> 'GigabitEthernet1/0/1').
 */
export function normalizeInterfaceName(name: string): string {
    const replacements: { [key: string]: string } = {
        'Gi': 'GigabitEthernet',
        'gi': 'GigabitEthernet',
        'GE': 'GigabitEthernet',
        'Fa': 'FastEthernet',
        'fa': 'FastEthernet',
        'Te': 'TenGigabitEthernet',
        'te': 'TenGigabitEthernet',
        'Et': 'Ethernet',
        'et': 'Ethernet',
        'Po': 'Port-channel',
        'po': 'Port-channel',
    };
    const match = name.match(/^([A-Za-z]+)([\d/.]+)$/);
    if (match) {
        const prefix = match[1];
        const rest = match[2];
        return (replacements[prefix] || prefix) + rest;
    }
    return name;
}