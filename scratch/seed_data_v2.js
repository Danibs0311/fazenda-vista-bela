
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ybupqkowtgflvpfetuha.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlidXBxa293dGdmbHZwZmV0dWhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NDA2MDMsImV4cCI6MjA5MDAxNjYwM30.Kh3iciKKMJrufImJnLi-_5jFFyedeJZj4ANEOybpPwI';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const banks = [
  { nome: 'Banco do Brasil', codigo: '001' },
  { nome: 'Itaú Unibanco', codigo: '341' },
  { nome: 'Bradesco', codigo: '237' }
];

const collaborators = [
  { id: 'COLLAB01', nome: 'JOAO SILVA', cpf: '123.456.789-01', banco: 'Banco do Brasil', agencia: '1234', conta: '12345-6', tipo_conta: 'corrente', status: 'active' },
  { id: 'COLLAB02', nome: 'MARIA SANTOS', cpf: '234.567.890-12', banco: 'Itaú Unibanco', agencia: '2345', conta: '23456-7', tipo_conta: 'poupanca', status: 'active' },
  { id: 'COLLAB03', nome: 'PEDRO OLIVEIRA', cpf: '345.678.901-23', banco: 'Bradesco', agencia: '3456', conta: '34567-8', tipo_conta: 'corrente', status: 'active' },
  { id: 'COLLAB04', nome: 'ANA COSTA', cpf: '456.789.012-34', banco: 'Banco do Brasil', agencia: '4567', conta: '45678-9', tipo_conta: 'salario', status: 'active' },
  { id: 'COLLAB05', nome: 'FRANCISCO PEREIRA', cpf: '567.890.123-45', banco: 'Itaú Unibanco', agencia: '5678', conta: '56789-0', tipo_conta: 'corrente', status: 'active' },
  { id: 'COLLAB06', nome: 'LUCIA MENDES', cpf: '678.901.234-56', banco: 'Bradesco', agencia: '6789', conta: '67890-1', tipo_conta: 'poupanca', status: 'active' },
  { id: 'COLLAB07', nome: 'CARLOS SOUZA', cpf: '789.012.345-67', banco: 'Banco do Brasil', agencia: '7890', conta: '78901-2', tipo_conta: 'corrente', status: 'active' },
  { id: 'COLLAB08', nome: 'ADRIANA LIMA', cpf: '890.123.456-78', banco: 'Itaú Unibanco', agencia: '8901', conta: '89012-3', tipo_conta: 'salario', status: 'active' },
  { id: 'COLLAB09', nome: 'RICARDO BARBOSA', cpf: '901.234.567-89', banco: 'Bradesco', agencia: '9012', conta: '90123-4', tipo_conta: 'corrente', status: 'active' },
  { id: 'COLLAB10', nome: 'JULIANA ROCHA', cpf: '012.345.678-90', banco: 'Banco do Brasil', agencia: '0123', conta: '01234-5', tipo_conta: 'poupanca', status: 'active' }
];

async function seed() {
  console.log('Inserting banks...');
  const { error: e1 } = await supabase.from('banks').upsert(banks, { onConflict: 'nome' });
  if (e1) {
    console.error('Banks Error:', e1);
    console.log('Trying "bancos"...');
    const { error: e1b } = await supabase.from('bancos').upsert(banks, { onConflict: 'nome' });
    if (e1b) console.error('Bancos Error:', e1b);
  }

  console.log('Inserting collaborators...');
  const { error: e2 } = await supabase.from('collaborators').upsert(collaborators, { onConflict: 'cpf' });
  if (e2) {
    console.error('Collaborators Error:', e2);
    console.log('Trying "colaboradores"...');
    // Map fields if needed? Let's assume same fields.
    const { error: e2b } = await supabase.from('colaboradores').upsert(collaborators, { onConflict: 'cpf' });
    if (e2b) console.error('Colaboradores Error:', e2b);
  }
}

seed();
