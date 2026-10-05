import { test } from 'node:test'
import assert from 'node:assert/strict'
import { safeCell, sectionsCsv, toCsv } from '../src/lib/export/csv'

test('fields with commas, quotes and newlines are quoted and escaped', () => {
  assert.equal(safeCell('a,b'), '"a,b"'); assert.equal(safeCell('say "hi"'), '"say ""hi"""'); assert.equal(safeCell('line\nbreak'), '"line\nbreak"')
  assert.equal(safeCell(null), ''); assert.equal(safeCell(0), '0'); assert.equal(safeCell(false), 'false')
})

test('spreadsheet formulas in user text are neutralised', () => {
  for (const attack of ['=HYPERLINK("http://evil","x")', '+SUM(1,1)', '-2+3', '@cmd', '\t=1+1']) assert.ok(safeCell(attack).replace(/^"/, '').startsWith("'"), attack)
  assert.equal(safeCell(-5), '-5', 'a real negative number is left alone')
})

test('a CSV carries a BOM and CRLF line ends so Excel opens it cleanly', () => {
  const csv = toCsv(['Client', 'Delivered'], [['Ramana Dental', 4], ['Café, Basil', 3]])
  assert.ok(csv.startsWith('﻿Client,Delivered\r\n')); assert.ok(csv.includes('"Café, Basil",3\r\n')); assert.ok(csv.endsWith('\r\n'))
})

test('sections are separated by a blank row', () => {
  const csv = sectionsCsv([{ title: 'Scope', header: ['Type', 'Delivered'], rows: [['Reels', 2]] }, { title: 'Items', rows: [['One']] }])
  assert.equal(csv, '﻿Scope\r\nType,Delivered\r\nReels,2\r\n\r\nItems\r\nOne\r\n')
})
