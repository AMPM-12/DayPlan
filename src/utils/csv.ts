function csvField(value: string | number | undefined): string {
  const str = value === undefined ? '' : String(value)
  return /[",\r\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
}

export function toCsv(rows: (string | number | undefined)[][]): string {
  return rows.map((row) => row.map(csvField).join(',')).join('\r\n')
}
