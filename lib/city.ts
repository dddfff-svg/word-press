export function cityLabel(value: Record<string, unknown>) {
  const city =
    typeof value.city === 'string' && value.city.trim()
      ? value.city.trim()
      : typeof value.locality === 'string'
        ? value.locality.trim()
        : ''
  const region =
    typeof value.principalSubdivision === 'string' ? value.principalSubdivision.trim() : ''
  if (!city) throw new Error('暂时无法识别城市，请手动填写')
  return [...new Set([region, city].filter(Boolean))].join(' · ').slice(0, 100)
}
