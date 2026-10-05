/** Hours as "18 h" up to two days, then "2.5 d". 0 means "no data" and shows as a dash. */
export const hoursLabel = (hours: number) => !hours ? '—' : hours >= 48 ? `${(hours / 24).toFixed(1)} d` : `${hours} h`
