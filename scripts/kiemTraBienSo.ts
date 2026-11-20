import assert from 'node:assert/strict'
import { chuanBienSo } from '../src/screens/cauHinhDanhMuc'

assert.equal(chuanBienSo('51c 123.45'), '51C-123.45')
assert.equal(chuanBienSo('51C-12345'), '51C-123.45')
assert.equal(chuanBienSo('51C 1234'), '51C-1234')
assert.equal(chuanBienSo('51LD-123.45'), '51LD-123.45')
assert.equal(chuanBienSo('59X1 123.45'), '59X1-123.45')
console.log('kiemTraBienSo: OK')
