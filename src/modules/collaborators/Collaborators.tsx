import React, { useState, useEffect, useMemo, useRef } from 'react';
import { storage, normalizeOperation } from '../../services/storageService';
import { Collaborator, CollaboratorStatus, Bank, HarvestLog } from '../../types';
import { getWeekRange } from '../../utils/dateUtils';
import { Plus, Search, Edit2, AlertCircle, X, User, Fingerprint, Landmark, ChevronDown, Save, FileSpreadsheet, Loader2, Upload, AlertTriangle, Trash2 } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { supabase } from '../../services/supabase';
import * as XLSX from 'xlsx';

export const Collaborators: React.FC = () => {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [weeklyHarvests, setWeeklyHarvests] = useState<HarvestLog[]>([]);
  const [isModalOpen, setModalOpen] = useState(false);
  const [isBankModalOpen, setBankModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCollab, setEditingCollab] = useState<Collaborator | null>(null);
  const [selectedBank, setSelectedBank] = useState('');
  const [isReadOnly, setIsReadOnly] = useState(true);
  const [error, setError] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const { showToast } = useToast();
  const [cpfValue, setCpfValue] = useState('');
  const [visibleCount, setVisibleCount] = useState(50);

  // PIX and Operation States
  const [isPixModalOpen, setPixModalOpen] = useState(false);
  const [pixKeyType, setPixKeyType] = useState<'TELEFONE' | 'CPF' | 'EMAIL' | 'CHAVE ALEATÓRIA'>('CPF');
  const [pixKeyValue, setPixKeyValue] = useState('');
  const [selectedOperationOption, setSelectedOperationOption] = useState('');
  const [customOperationValue, setCustomOperationValue] = useState('');
  const [agenciaValue, setAgenciaValue] = useState('');
  const [contaValue, setContaValue] = useState('');

  useEffect(() => {
    setVisibleCount(50);
  }, [searchTerm]);
  
  // Import States
  const [isImportModalOpen, setImportModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importError, setImportError] = useState('');
  const importFileInputRef = useRef<HTMLInputElement>(null);

  const validateCPF = (cpf: string) => {
    const cleanCPF = cpf.replace(/\D/g, '');
    if (cleanCPF === '00000000000') return true; // Permitir CPF zerado
    if (cleanCPF.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
    
    let sum = 0;
    let rest;
    for (let i = 1; i <= 9; i++) sum = sum + parseInt(cleanCPF.substring(i - 1, i)) * (11 - i);
    rest = (sum * 10) % 11;
    if ((rest === 10) || (rest === 11)) rest = 0;
    if (rest !== parseInt(cleanCPF.substring(9, 10))) return false;
    
    sum = 0;
    for (let i = 1; i <= 10; i++) sum = sum + parseInt(cleanCPF.substring(i - 1, i)) * (12 - i);
    rest = (sum * 10) % 11;
    if ((rest === 10) || (rest === 11)) rest = 0;
    if (rest !== parseInt(cleanCPF.substring(10, 11))) return false;
    
    return true;
  };

  const formatCPF = (value: string) => {
    const digits = value.replace(/\D/g, '');
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const intelligentMatchBank = (bankName: string, registeredBanks: Bank[]) => {
    if (!bankName) return 'OUTRO';
    
    const clean = String(bankName).trim().toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');

    // 1. Caixa Econômica
    if (clean.includes('caixa') || clean.includes('cx') || clean.includes('cef') || clean.includes('economica')) {
      const found = registeredBanks.find(b => {
        const nameClean = b.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return nameClean.includes('caixa') || nameClean.includes('cx') || nameClean.includes('cef') || nameClean.includes('economica');
      });
      if (found) return found.nome;
      return 'CAIXA ECONÔMICA';
    }

    // 2. Banco do Brasil
    if (clean === 'bb' || clean.includes('brasil') || clean.includes('dobrasil')) {
      const found = registeredBanks.find(b => {
        const nameClean = b.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return nameClean.includes('brasil') || nameClean.includes('bb');
      });
      if (found) return found.nome;
      return 'BANCO DO BRASIL';
    }

    // 3. Itaú
    if (clean.includes('itau')) {
      const found = registeredBanks.find(b => {
        const nameClean = b.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return nameClean.includes('itau');
      });
      if (found) return found.nome;
      return 'ITAÚ UNIBANCO';
    }

    // 4. Nubank
    if (clean.includes('nubank') || clean === 'nu') {
      const found = registeredBanks.find(b => {
        const nameClean = b.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return nameClean.includes('nubank') || nameClean === 'nu';
      });
      if (found) return found.nome;
      return 'NUBANK';
    }

    // 5. Inter
    if (clean.includes('inter')) {
      const found = registeredBanks.find(b => {
        const nameClean = b.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return nameClean.includes('inter');
      });
      if (found) return found.nome;
      return 'INTER';
    }

    // 6. Bradesco
    if (clean.includes('bradesco') || clean.includes('brad')) {
      const found = registeredBanks.find(b => {
        const nameClean = b.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return nameClean.includes('bradesco') || nameClean.includes('brad');
      });
      if (found) return found.nome;
      return 'BRADESCO';
    }

    // 7. Match generic
    for (const b of registeredBanks) {
      const nameClean = b.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
      if (nameClean.includes(clean) || clean.includes(nameClean)) {
        return b.nome;
      }
    }

    return String(bankName).trim().toUpperCase();
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportProgress(0);
    setImportError('');

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      
      let sheetName = workbook.SheetNames.find(name => 
        /colaboradores|cadastros|colaborador|cadastro|membros|equipe/i.test(name)
      ) || workbook.SheetNames[0];

      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });

      if (rows.length < 2) {
        throw new Error('Planilha vazia ou sem cabeçalhos.');
      }

      let headerIndex = -1;
      for (let i = 0; i < Math.min(10, rows.length); i++) {
        const row = rows[i];
        if (row && (row.includes('ID') || row.includes('BENEFICIÁRIOS') || row.includes('NOME') || row.includes('Banco'))) {
          headerIndex = i;
          break;
        }
      }

      if (headerIndex === -1) {
        headerIndex = 0;
      }

      const headers = rows[headerIndex].map(h => String(h || '').trim());
      
      let idCol = headers.findIndex(h => {
        const s = h.toLowerCase().trim();
        return s === 'id' || s === 'código' || s === 'codigo' || s === 'nº' || s === 'no' || s === 'cadastro' || s === 'cod' || s.startsWith('id ') || s.startsWith('id.');
      });

      let nameCol = headers.findIndex(h => {
        const s = h.toLowerCase().trim();
        return s.includes('benefici') || s.includes('nome') || s.includes('colaborador') || s === 'nome completo';
      });

      let cpfCol = headers.findIndex(h => {
        const s = h.toLowerCase().trim();
        return s === 'cpf' || s === 'documento' || s.includes('cpf');
      });

      let bankCol = headers.findIndex(h => {
        const s = h.toLowerCase().trim();
        return s.includes('banco') || s.includes('institu');
      });

      let agCol = headers.findIndex(h => {
        const s = h.toLowerCase().trim();
        return s.startsWith('ag') || s.includes('agencia') || s.includes('agência');
      });

      let opCol = headers.findIndex(h => {
        const s = h.toLowerCase().trim();
        return (
          s === 'op' || 
          s === 'op.' || 
          s === 'o.p' || 
          s.startsWith('op ') || 
          s.startsWith('op.') || 
          s.startsWith('oper') || 
          s.includes('tipo') || 
          s.includes('tp') || 
          s.includes('c/c') || 
          s.includes('c/p') ||
          s.includes('operação') ||
          s.includes('operacao')
        );
      });

      let accCol = headers.findIndex(h => {
        const s = h.toLowerCase().trim();
        return s.includes('conta') && !s.includes('tipo') && !s.includes('op');
      });

      const numCols = headers.length;

      // Fallback Scanner: If any critical column is not found in headers, analyze cells of non-empty rows
      const colScores = Array.from({ length: numCols }, () => ({
        id: 0,
        name: 0,
        cpf: 0,
        bank: 0,
        ag: 0,
        op: 0,
        acc: 0
      }));

      let scannedCount = 0;
      for (let i = headerIndex + 1; i < rows.length && scannedCount < 50; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;
        
        // Skip completely empty rows
        const hasData = row.some(cell => String(cell || '').trim() !== '');
        if (!hasData) continue;

        scannedCount++;
        
        for (let colIdx = 0; colIdx < Math.min(row.length, numCols); colIdx++) {
          const val = String(row[colIdx] || '').trim();
          if (!val) continue;

          const valUpper = val.toUpperCase();
          const digits = val.replace(/\D/g, '');

          // Check for OP candidate
          const normalizedDigits = /^\d+(\.0+)?$/.test(valUpper) ? String(Math.floor(parseFloat(valUpper))) : '';
          if (
            valUpper === '13' || valUpper === '23' || valUpper === '013' || valUpper === '023' ||
            normalizedDigits === '13' || normalizedDigits === '23' || normalizedDigits === '013' || normalizedDigits === '023' ||
            valUpper === 'CC' || valUpper === 'CP' || valUpper === 'POUP' || valUpper === 'CORR' ||
            valUpper === 'CORRENTE' || valUpper === 'POUPANÇA' || valUpper === 'POUPANCA' ||
            valUpper === 'C/C' || valUpper === 'C/P' || valUpper === 'C/ CORR' || valUpper === 'C/CORR' ||
            valUpper === 'C/POUP' || valUpper === 'C/ POUP' || valUpper === '0'
          ) {
            colScores[colIdx].op += 1;
          }

          // Check for CPF candidate
          if (digits.length === 11) {
            colScores[colIdx].cpf += 1;
          }

          // Check for Bank candidate
          if (
            valUpper.includes('BRASIL') || valUpper.includes('ITAU') || valUpper.includes('ITAÚ') ||
            valUpper.includes('BRADESCO') || valUpper.includes('CAIXA') || valUpper.includes('SANTANDER') ||
            valUpper.includes('NUBANK') || valUpper.includes('INTER') || valUpper.includes('C6')
          ) {
            colScores[colIdx].bank += 1;
          }

          // Check for Agencia candidate
          if (digits.length >= 3 && digits.length <= 5 && /^\d+[-]?\d*$/.test(val)) {
            colScores[colIdx].ag += 1;
          }

          // Check for Conta candidate
          if (digits.length >= 4 && digits.length <= 12 && val.includes('-')) {
            colScores[colIdx].acc += 1;
          }

          // Check for ID candidate
          if (/^\d+$/.test(val) && parseInt(val) < 2000) {
            colScores[colIdx].id += 1;
          }

          // Check for Name candidate
          if (val.length > 5 && /^[A-ZÁÉÍÓÚÂÊÔÃÕÇ\s]+$/i.test(val) && !val.includes('-')) {
            colScores[colIdx].name += 1;
          }
        }
      }

      // Assign columns based on highest score if they were not found in headers
      if (nameCol === -1) {
        let bestIdx = -1, maxScore = 0;
        for (let c = 0; c < numCols; c++) {
          if (colScores[c].name > maxScore) {
            maxScore = colScores[c].name;
            bestIdx = c;
          }
        }
        if (bestIdx !== -1) nameCol = bestIdx;
      }

      if (bankCol === -1) {
        let bestIdx = -1, maxScore = 0;
        for (let c = 0; c < numCols; c++) {
          if (c === nameCol) continue;
          if (colScores[c].bank > maxScore) {
            maxScore = colScores[c].bank;
            bestIdx = c;
          }
        }
        if (bestIdx !== -1) bankCol = bestIdx;
      }

      if (cpfCol === -1) {
        let bestIdx = -1, maxScore = 0;
        for (let c = 0; c < numCols; c++) {
          if (c === nameCol || c === bankCol) continue;
          if (colScores[c].cpf > maxScore) {
            maxScore = colScores[c].cpf;
            bestIdx = c;
          }
        }
        if (bestIdx !== -1) cpfCol = bestIdx;
      }

      if (agCol === -1) {
        let bestIdx = -1, maxScore = 0;
        for (let c = 0; c < numCols; c++) {
          if (c === nameCol || c === bankCol || c === cpfCol) continue;
          if (colScores[c].ag > maxScore) {
            maxScore = colScores[c].ag;
            bestIdx = c;
          }
        }
        if (bestIdx !== -1) agCol = bestIdx;
      }

      if (accCol === -1) {
        let bestIdx = -1, maxScore = 0;
        for (let c = 0; c < numCols; c++) {
          if (c === nameCol || c === bankCol || c === cpfCol || c === agCol) continue;
          if (colScores[c].acc > maxScore) {
            maxScore = colScores[c].acc;
            bestIdx = c;
          }
        }
        if (bestIdx !== -1) accCol = bestIdx;
      }

      if (opCol === -1) {
        let bestIdx = -1, maxScore = 0;
        for (let c = 0; c < numCols; c++) {
          if (c === nameCol || c === bankCol || c === cpfCol || c === agCol || c === accCol) continue;
          if (colScores[c].op > maxScore) {
            maxScore = colScores[c].op;
            bestIdx = c;
          }
        }
        if (bestIdx !== -1) opCol = bestIdx;
      }

      if (idCol === -1) {
        let bestIdx = -1, maxScore = 0;
        for (let c = 0; c < numCols; c++) {
          if (c === nameCol || c === bankCol || c === cpfCol || c === agCol || c === accCol || c === opCol) continue;
          if (colScores[c].id > maxScore) {
            maxScore = colScores[c].id;
            bestIdx = c;
          }
        }
        if (bestIdx !== -1) idCol = bestIdx;
      }

      if (nameCol === -1) {
        throw new Error('Coluna de "Nome/Beneficiário" não encontrada na planilha.');
      }

      const parsedCollabs: Collaborator[] = [];

      const { data: existingCollabs } = await supabase.from('collaborators').select('id');
      const maxExistingId = existingCollabs
        ? Math.max(...existingCollabs.map(c => parseInt(c.id)).filter(id => !isNaN(id)), 0)
        : 0;

      let nextAutoId = maxExistingId + 1;

      for (let i = headerIndex + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;

        const rawName = row[nameCol];
        if (!rawName || String(rawName).trim() === '') continue;

        const nome = String(rawName).trim().toUpperCase();
        
        let rawId = idCol !== -1 ? String(row[idCol] || '').trim() : '';
        if (rawId && /^\d+(\.0+)?$/.test(rawId)) {
          rawId = String(Math.floor(parseFloat(rawId)));
        }
        const id = rawId || String(nextAutoId++);

        // CPF handling: if empty, invalid or wrong length, set to "000.000.000-00" (zerado)
        let cpf = cpfCol !== -1 && row[cpfCol] ? String(row[cpfCol]).trim().replace(/\D/g, '') : '';
        let formattedCpf = '000.000.000-00';
        
        if (cpf && cpf.length === 11 && validateCPF(cpf)) {
          formattedCpf = cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        }

        const bancoRaw = bankCol !== -1 ? String(row[bankCol] || '').trim() : '';
        const banco = intelligentMatchBank(bancoRaw, banks);
        const agencia = agCol !== -1 ? String(row[agCol] || '').trim() : '';
        
        // Read raw OP operation text and normalize it
        const rawOp = opCol !== -1 ? String(row[opCol] || '').trim() : '';
        const tipo_conta = normalizeOperation(rawOp);

        const conta = accCol !== -1 ? String(row[accCol] || '').trim() : '';

        parsedCollabs.push({
          id,
          nome: nome.toUpperCase(),
          cpf: formattedCpf,
          banco: banco.toUpperCase(),
          agencia: (agencia || '0000').toUpperCase(),
          conta: (conta || '00000-0').toUpperCase(),
          tipo_conta: tipo_conta.toUpperCase(),
          status: CollaboratorStatus.ACTIVE,
          data_cadastro: new Date().toISOString()
        });
      }

      if (parsedCollabs.length === 0) {
        throw new Error('Nenhum colaborador válido encontrado para importação.');
      }

      // Auto-register any new banks found during import
      const uniqueBanksInImport = Array.from(new Set(parsedCollabs.map(c => c.banco)));
      const existingBankNamesNormalized = banks.map(b => b.nome.toUpperCase());
      
      for (const importBankName of uniqueBanksInImport) {
        if (!existingBankNamesNormalized.includes(importBankName.toUpperCase())) {
          try {
            await storage.saveBank({ nome: importBankName.toUpperCase() });
            console.log(`Auto-registered bank: ${importBankName}`);
          } catch (bankErr) {
            console.error(`Failed to auto-register bank ${importBankName}:`, bankErr);
          }
        }
      }

      const batchSize = 100;
      for (let j = 0; j < parsedCollabs.length; j += batchSize) {
        const batch = parsedCollabs.slice(j, j + batchSize);
        const { error: upsertErr } = await supabase.from('collaborators').upsert(batch);
        
        if (upsertErr) {
          throw new Error('Erro ao salvar lote no banco de dados: ' + upsertErr.message);
        }

        setImportProgress(Math.round(((j + batch.length) / parsedCollabs.length) * 100));
      }

      showToast(`Importação concluída! ${parsedCollabs.length} colaboradores importados.`, 'success');
      setImportModalOpen(false);
      await storage.getCollaborators(true); // Force-refresh and update cache once
      await loadData();
    } catch (err: any) {
      console.error('Import failed:', err);
      setImportError(err.message || 'Falha desconhecida na importação.');
    } finally {
      setIsImporting(false);
      if (e.target) e.target.value = '';
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const activeRow = document.getElementById(`collab-row-${activeIndex}`);
    if (activeRow) {
      activeRow.scrollIntoView({ behavior: 'auto', block: 'nearest' });
    }
  }, [activeIndex]);

  const loadData = async () => {
    const currentWeekId = getWeekRange().id;
    const [collabData, bankData, currentWeekHarvests] = await Promise.all([
      storage.getCollaborators(),
      storage.getBanks(),
      storage.getHarvestsByWeek(currentWeekId)
    ]);
    
    setCollaborators(collabData);
    setBanks(bankData);
    setWeeklyHarvests(currentWeekHarvests);
  };

  const getNextSequentialId = () => {
    const numericIds = collaborators
      .map(c => parseInt(c.id))
      .filter(id => !isNaN(id) && id > 0);
    
    const idSet = new Set(numericIds);
    let candidate = 1;
    while (idSet.has(candidate)) {
      candidate++;
    }
    return candidate.toString();
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const cpfRaw = formData.get('cpf') as string;
    
    // Normalize and validate CPF
    const cleanCpf = (cpfRaw || '').replace(/\D/g, '');
    let formattedCpf = '000.000.000-00';
    
    if (cleanCpf && cleanCpf.length === 11 && validateCPF(cleanCpf)) {
      formattedCpf = cleanCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }

    // Only validate uniqueness for non-zeroed CPFs
    if (formattedCpf !== '000.000.000-00') {
      const existing = collaborators.find(c => c.cpf === formattedCpf && c.id !== (editingCollab?.id || ''));
      if (existing) {
        setError('Este CPF já está cadastrado.');
        return;
      }
    }

    const collab: Collaborator = {
      id: editingCollab?.id || getNextSequentialId(),
      nome: formData.get('nome') as string,
      cpf: formattedCpf,
      banco: selectedOperationOption === 'PIX' ? '' : (formData.get('banco') as string || ''),
      agencia: selectedOperationOption === 'PIX' ? '' : (formData.get('agencia') as string || ''),
      conta: selectedOperationOption === 'PIX' ? pixKeyValue : (formData.get('conta') as string || ''),
      tipo_conta: selectedOperationOption === 'PIX' 
        ? `PIX (${pixKeyType})` 
        : (selectedOperationOption === 'OUTRO' ? customOperationValue : selectedOperationOption),
      status: editingCollab?.status || CollaboratorStatus.ACTIVE,
      data_cadastro: editingCollab?.data_cadastro || new Date().toISOString()
    };

    try {
      await storage.saveCollaborator(collab);
      await loadData();
      setModalOpen(false);
      setEditingCollab(null);
      setSelectedBank('');
      setError('');
      showToast(editingCollab ? 'Colaborador atualizado!' : 'Novo colaborador cadastrado!', 'success');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (collab: Collaborator) => {
    if (window.confirm(`Tem certeza que deseja excluir o colaborador "${collab.nome}" (ID: ${collab.id})?`)) {
      try {
        await storage.deleteCollaborator(collab.id);
        await loadData();
        showToast('Colaborador excluído com sucesso!', 'success');
      } catch (err: any) {
        showToast(err.message || 'Erro ao excluir colaborador.', 'error');
      }
    }
  };
  const existingOperations = useMemo(() => {
    const ops = new Set<string>();
    collaborators.forEach(c => {
      if (c.tipo_conta) {
        const clean = c.tipo_conta.toUpperCase().trim();
        if (clean && !clean.startsWith('PIX')) {
          ops.add(clean);
        }
      }
    });
    ops.add('CORRENTE');
    ops.add('POUPANÇA');
    return Array.from(ops);
  }, [collaborators]);

  const handleOpenEditModal = (c: Collaborator, readOnly = false) => {
    setEditingCollab(c);
    setIsReadOnly(readOnly);
    setCpfValue(c.cpf || '');
    setSelectedBank(c.banco || '');
    setAgenciaValue(c.agencia || '');
    setContaValue(c.conta || '');

    const op = c.tipo_conta || '';
    const upperOp = op.toUpperCase().trim();
    if (upperOp.startsWith('PIX')) {
      setSelectedOperationOption('PIX');
      const match = op.match(/\(([^)]+)\)/);
      const keyType = match ? match[1].toUpperCase() : 'CPF';
      if (['TELEFONE', 'CPF', 'EMAIL', 'CHAVE ALEATÓRIA'].includes(keyType)) {
        setPixKeyType(keyType as any);
      } else {
        setPixKeyType('CPF');
      }
      setPixKeyValue(c.conta || '');
    } else {
      if (['CORRENTE', 'POUPANÇA', '013', '023'].includes(upperOp) || existingOperations.includes(upperOp)) {
        setSelectedOperationOption(upperOp);
        setCustomOperationValue('');
      } else if (upperOp) {
        setSelectedOperationOption('OUTRO');
        setCustomOperationValue(op);
      } else {
        setSelectedOperationOption('');
        setCustomOperationValue('');
      }
      setPixKeyType('CPF');
      setPixKeyValue('');
    }

    setModalOpen(true);
  };

  const handleOpenNewModal = () => {
    setEditingCollab(null);
    setIsReadOnly(false);
    setCpfValue('');
    setSelectedBank('');
    setAgenciaValue('');
    setContaValue('');
    setSelectedOperationOption('');
    setCustomOperationValue('');
    setPixKeyType('CPF');
    setPixKeyValue('');
    setModalOpen(true);
  };

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return collaborators
      .filter(c => {
        if (!term) return true;
        const termDigits = term.replace(/\D/g, '');
        return (
          (c.nome?.toLowerCase().startsWith(term) ?? false) ||
          (c.id?.toLowerCase().startsWith(term) ?? false) ||
          (termDigits !== '' && (c.cpf?.replace(/\D/g, '').startsWith(termDigits) ?? false))
        );
      })
      .sort((a, b) => (a.id || "").localeCompare(b.id || "", undefined, { numeric: true }));
  }, [collaborators, searchTerm]);

  return (
    <div className="h-auto min-h-full md:h-full flex flex-col space-y-4 animate-in fade-in duration-700 overflow-visible md:overflow-hidden pb-10 md:pb-0">
      {/* Header Section - Otimizado para bater com Lançar Colheita */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 flex-shrink-0">
        <div className="space-y-0">
          <div className="flex items-center gap-2">
             <span className="px-1.5 py-0.5 bg-primary text-white text-[7px] font-black uppercase tracking-widest rounded-full">Gestão</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-dark tracking-tight leading-none uppercase italic">COLABORADORES</h1>
          <p className="text-secondary/60 font-medium text-[10px]">Gerenciamento de colaboradores</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setImportModalOpen(true)}
            className="px-5 py-3 bg-slate-150 hover:bg-slate-200 text-primary rounded-xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm border border-slate-250 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-primary" />
            Importar Planilha
          </button>
          
          <button
            onClick={handleOpenNewModal}
            className="!bg-primary !text-white px-5 py-3 rounded-xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 hover:!bg-dark transition-all active:scale-95 shadow-lg shadow-primary/20 group cursor-pointer"
          >
            <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
            Novo Colaborador
          </button>
        </div>
      </div>

      {/* Main Table Container - Occupies remaining space */}
      <div className="flex-1 bg-white rounded-[32px] border border-slate-100/50 shadow-premium overflow-visible md:overflow-hidden group flex flex-col min-h-0 lg:overflow-hidden">
        {/* Search Bar - Fixed part of the table container */}
        <div className="p-4 border-b border-slate-50 flex items-center gap-4 bg-background/30 flex-shrink-0">
          <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-100 text-secondary/30">
             <Search className="w-5 h-5" />
          </div>
          <div className="relative flex-1">
            <div className="absolute inset-0 pointer-events-none flex items-center px-4 font-black text-lg uppercase z-20 tracking-tight">
              <span className="text-transparent whitespace-pre">{searchTerm}</span>
              {searchTerm && filtered.length > 0 && (
                <span className="text-primary/25 whitespace-pre">
                  {(() => {
                    const current = filtered[activeIndex] || filtered[0];
                    if (!current || !current.nome || !current.id) return '';
                    const suggestion = `${current.nome} (ID: ${current.id})`;
                    if (suggestion.toLowerCase().startsWith(searchTerm.toLowerCase())) {
                      return suggestion.substring(searchTerm.length);
                    }
                    return '';
                  })()}
                </span>
              )}
            </div>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Pesquisar por nome, CPF ou ID..."
              className="bg-white border-2 border-primary focus:ring-0 w-full text-lg font-black text-primary placeholder:text-primary/10 uppercase tracking-tight rounded-xl px-4 py-2 shadow-sm relative z-10"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setActiveIndex(0);
              }}
              onWheel={(e) => {
                if (filtered.length > 0) {
                  if (e.deltaY > 0) {
                    setActiveIndex(prev => Math.max(0, Math.min(prev + 1, filtered.length - 1)));
                  } else {
                    setActiveIndex(prev => Math.max(0, Math.min(prev - 1, filtered.length - 1)));
                  }
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setActiveIndex(prev => Math.max(0, Math.min(prev + 1, filtered.length - 1)));
                }
                if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setActiveIndex(prev => Math.max(0, Math.min(prev - 1, filtered.length - 1)));
                }
                if (e.key === 'Enter' && searchTerm && filtered.length > 0) {
                  e.preventDefault();
                  const current = filtered[activeIndex];
                  handleOpenEditModal(current, true);
                }
                if ((e.key === 'Tab' || e.key === 'ArrowRight') && searchTerm && filtered.length > 0) {
                  const current = filtered[activeIndex];
                  const suggestion = `${current.nome} (ID: ${current.id})`;
                  if (suggestion.toLowerCase().startsWith(searchTerm.toLowerCase())) {
                    e.preventDefault();
                    setSearchTerm(current.nome);
                  }
                }
              }}
            />
          </div>
        </div>

        {/* List Header - Fixed */}
        <div className="hidden md:flex px-4 py-2.5 bg-primary border-b border-white/10 items-center text-[10px] font-black uppercase tracking-widest text-white sticky top-0 z-30 shadow-md">
          <div className="flex-[1.5] px-8">Informações Pessoais</div>
          <div className="flex-[1.5] px-8">Dados Bancários</div>
          <div className="w-32 px-8 text-center">Status</div>
          <div className="w-40 px-8 text-right">Ações</div>
        </div>

        {/* List - Scrollable area */}
        <div 
          className="flex-1 overflow-visible md:overflow-y-auto overscroll-contain no-scrollbar min-h-0 p-3 space-y-2 bg-slate-50/30"
          onScroll={(e) => {
            const target = e.currentTarget;
            if (target.scrollHeight - target.scrollTop <= target.clientHeight + 100) {
              setVisibleCount(prev => Math.min(prev + 50, filtered.length));
            }
          }}
        >
          {filtered.slice(0, visibleCount).map((c, index) => (
            <div 
              key={c.id} 
              id={`collab-row-${index}`}
              onClick={() => { setActiveIndex(index); searchInputRef.current?.focus(); }}
              className={`flex flex-col md:flex-row md:items-center p-1.5 rounded-[18px] border-2 transition-all duration-200 cursor-pointer group relative ${
                activeIndex === index 
                ? 'border-primary bg-white shadow-lg shadow-primary/10 z-10' 
                : 'border-white bg-white hover:border-primary/20 hover:shadow-md'
              }`}
            >
              {/* Informações Pessoais */}
              <div className="flex-[1.5] px-4 md:px-8 py-1">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all shadow-sm ${activeIndex === index ? 'bg-primary text-white' : 'bg-slate-50 text-secondary/30 group-hover:text-primary'}`}>
                    <User className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <div className="font-black text-dark text-[13px] uppercase tracking-tight leading-none">{c.nome}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-black text-dark uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded border border-slate-200">ID: {c.id}</span>
                      <span className={`text-[10px] font-mono font-black tracking-wider ${c.cpf ? 'text-dark' : 'text-slate-400 italic font-bold'}`}>
                        {c.cpf || 'Sem CPF'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dados Bancários */}
              <div className="flex-[1.5] px-4 md:px-8 py-1 border-t md:border-t-0 md:border-l border-slate-50">
                {c.tipo_conta?.toUpperCase().startsWith('PIX') ? (
                  <div className="flex items-center gap-3 text-dark/80">
                    <div className="w-9 h-9 rounded-lg bg-success/5 border border-success/15 shadow-sm flex items-center justify-center">
                      <span className="text-[9px] font-black text-success">PIX</span>
                    </div>
                    <div>
                      <div className="font-black text-success uppercase tracking-wider leading-none text-[12px]">PIX</div>
                      <div className="text-[10px] font-black text-dark mt-1 uppercase tracking-tight flex items-center gap-2">
                        <span className="bg-success/10 px-2 py-0.5 rounded-full italic text-[8px] border border-success/10 text-success font-black">
                          {c.tipo_conta}
                        </span>
                        <span className="font-mono text-primary font-black select-all">{c.conta}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 text-dark/80">
                    <div className="w-9 h-9 rounded-lg bg-white border border-slate-100 shadow-sm flex items-center justify-center">
                      <Landmark className="w-4.5 h-4.5 text-primary" />
                    </div>
                    <div>
                      <div className="font-black text-dark uppercase tracking-tight leading-none text-[13px]">{c.banco}</div>
                      <div className="text-[9px] font-black text-dark mt-1 uppercase tracking-widest flex items-center gap-2">
                        {c.agencia} • {c.conta} 
                        <span className="bg-slate-100 px-2 py-0.5 rounded-full italic text-[8px] border border-slate-200 text-dark/80">{c.tipo_conta}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Status */}
              <div className="w-full md:w-32 px-4 md:px-8 py-2 md:py-1 text-center border-t md:border-t-0 md:border-l border-slate-50">
                {(() => {
                  const isActive = weeklyHarvests.some(h => h.colaborador_id === c.id);
                  return (
                    <span className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[8px] font-black uppercase tracking-[0.1em] ${isActive
                      ? 'bg-success/10 text-success border border-success/10'
                      : 'bg-secondary/5 text-secondary/40 border border-slate-100'
                      }`}>
                      <div className={`w-1 h-1 rounded-full ${isActive ? 'bg-success animate-pulse' : 'bg-secondary/30'}`} />
                      {isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  );
                })()}
              </div>

              {/* Ações */}
              <div className="w-full md:w-44 px-4 md:px-6 py-1 text-right border-t md:border-t-0 md:border-l border-slate-50">
                <div className="flex justify-center md:justify-end gap-1.5 transition-all">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleOpenEditModal(c, false); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 !bg-primary !text-white hover:!bg-dark rounded-lg transition-all active:scale-90 shadow-lg shadow-primary/20"
                  >
                    <Edit2 className="w-3.5 h-3.5 !text-white" />
                    <span className="text-[10px] font-black uppercase tracking-tighter !text-white">Editar</span>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(c); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 !bg-success !text-white hover:!bg-success/90 rounded-lg transition-all active:scale-90 shadow-lg shadow-success/20 animate-in fade-in"
                  >
                    <Trash2 className="w-3.5 h-3.5 !text-white" />
                    <span className="text-[10px] font-black uppercase tracking-tighter !text-white">Excluir</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {searchTerm && filtered.length === 0 && (
            <div className="p-12 text-center">
              <div className="bg-danger/5 border border-danger/10 rounded-3xl p-8 max-w-sm mx-auto space-y-4 animate-in zoom-in-95 duration-300 shadow-xl shadow-danger/5">
                <div className="space-y-1">
                  <p className="text-sm font-black text-danger uppercase tracking-widest">Colaborador Não Encontrado</p>
                  <p className="text-[10px] font-black text-secondary/60 uppercase tracking-tight">Deseja cadastrar novo agora?</p>
                </div>
                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={handleOpenNewModal}
                    className="bg-primary text-white px-6 py-2.5 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-primary/90 transition-all active:scale-95 shadow-lg shadow-primary/25"
                  >
                    Sim, Cadastrar
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="bg-white text-secondary/60 px-6 py-2.5 rounded-xl font-black uppercase tracking-widest text-[10px] border border-slate-200 hover:bg-slate-50 transition-all"
                  >
                    Limpar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modern Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-dark/60 backdrop-blur-xl animate-in fade-in">
          <div className="bg-white rounded-[32px] w-full max-w-xl shadow-2xl relative animate-in zoom-in-95 border border-white/20 flex flex-col overflow-hidden my-auto">
            <div className="p-5 pb-3 flex items-center justify-between bg-white border-b border-slate-100">
              <div className="space-y-1">
                <h2 className="text-xl font-black text-dark tracking-tight leading-none uppercase italic">
                  {isReadOnly ? 'Ficha do' : (editingCollab ? 'Editar' : 'Novo')} <span className="text-primary not-italic">Colaborador</span>
                </h2>
              </div>
              <button 
                onClick={() => setModalOpen(false)}
                className="p-2 bg-slate-50 rounded-xl text-secondary/30 hover:text-primary hover:bg-primary/5 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 pt-4 max-h-[calc(100vh-140px)] overflow-y-auto no-scrollbar">
               <form onSubmit={handleSave} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-3 bg-danger/5 text-danger p-3 rounded-xl border border-danger/10 text-[9px] font-black uppercase tracking-tight">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2 space-y-1 group opacity-60">
                    <label className="text-[11px] font-black uppercase tracking-widest text-dark/70 px-2">ID Interno</label>
                    <div className="relative">
                      <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary/20" />
                      <input 
                        disabled
                        value={editingCollab ? editingCollab.id : getNextSequentialId()} 
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-2 px-10 text-secondary/40 font-black text-sm outline-none cursor-not-allowed" 
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2 space-y-1 group">
                    <label className="text-[11px] font-black uppercase tracking-widest text-dark/70 px-2">Nome Completo</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary/20" />
                      <input 
                        name="nome" 
                        required 
                        disabled={isReadOnly}
                        defaultValue={editingCollab?.nome} 
                        className="w-full bg-white border-2 border-primary focus:border-primary/50 rounded-xl py-2 px-10 text-primary outline-none transition-all font-black text-sm placeholder:text-primary/10 shadow-sm disabled:opacity-70" 
                        placeholder="Ex: João da Silva"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-1 group">
                    <label className="text-[11px] font-black uppercase tracking-widest text-dark/70 px-2">CPF (Opcional)</label>
                    <input 
                      name="cpf" 
                      disabled={isReadOnly}
                      value={cpfValue || ''}
                      onChange={(e) => setCpfValue(formatCPF(e.target.value))}
                      className="w-full bg-white border-2 border-primary focus:border-primary/50 rounded-xl py-2 px-4 text-primary outline-none transition-all font-black text-sm font-mono shadow-sm disabled:opacity-70"
                      placeholder="000.000.000-00 (Opcional)"
                    />
                  </div>

                  <div className="space-y-1 group">
                    <label className="text-[11px] font-black uppercase tracking-widest text-dark/70 px-2">Banco</label>
                    <div className="relative">
                       <select 
                        name="banco" 
                        required={selectedOperationOption !== 'PIX'} 
                        disabled={isReadOnly || selectedOperationOption === 'PIX'}
                        value={selectedOperationOption === 'PIX' ? '' : selectedBank}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'OUTRO') {
                            setBankModalOpen(true);
                          } else {
                            setSelectedBank(val);
                          }
                        }}
                        className="w-full appearance-none bg-white border-2 border-primary focus:border-primary/50 rounded-xl py-2 px-4 text-primary outline-none transition-all font-black text-sm cursor-pointer shadow-sm disabled:opacity-75 disabled:bg-slate-50"
                      >
                        <option value="">Selecione</option>
                        {banks.map(b => (
                          <option key={b.id} value={b.nome}>{b.nome}</option>
                        ))}
                        <option value="OUTRO" className="font-black text-accent bg-slate-50">+ OUTRO (CADASTRAR NOVO)</option>
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-1 group">
                    <label className="text-[11px] font-black uppercase tracking-widest text-dark/70 px-2">Agência</label>
                    <input 
                      name="agencia" 
                      required={selectedOperationOption !== 'PIX'} 
                      disabled={isReadOnly || selectedOperationOption === 'PIX'}
                      value={selectedOperationOption === 'PIX' ? '0' : agenciaValue}
                      onChange={(e) => setAgenciaValue(e.target.value)}
                      className="w-full bg-white border-2 border-primary focus:border-primary/50 rounded-xl py-2 px-4 text-primary outline-none transition-all font-black text-sm shadow-sm disabled:opacity-75 disabled:bg-slate-50"
                      placeholder="0000"
                    />
                  </div>

                  <div className="space-y-1 group">
                    <label className="text-[11px] font-black uppercase tracking-widest text-dark/70 px-2">Conta</label>
                    <input 
                      name="conta" 
                      required={selectedOperationOption !== 'PIX'} 
                      disabled={isReadOnly || selectedOperationOption === 'PIX'}
                      value={selectedOperationOption === 'PIX' ? pixKeyValue : contaValue}
                      onChange={(e) => setContaValue(e.target.value)}
                      className="w-full bg-white border-2 border-primary focus:border-primary/50 rounded-xl py-2 px-4 text-primary outline-none transition-all font-black text-sm font-mono shadow-sm disabled:opacity-75 disabled:bg-slate-50"
                      placeholder={selectedOperationOption === 'PIX' ? 'Chave PIX' : '00000-0'}
                    />
                  </div>

                  <div className="space-y-1 group md:col-span-2">
                    <label className="text-[11px] font-black uppercase tracking-widest text-dark/70 px-2">Operação / Tipo de Conta</label>
                    <div className="relative">
                      <select
                        name="tipo_conta"
                        required
                        disabled={isReadOnly}
                        value={selectedOperationOption}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedOperationOption(val);
                          if (val === 'PIX') {
                            if (!pixKeyValue && cpfValue && cpfValue !== '000.000.000-00') {
                              setPixKeyValue(cpfValue);
                              setPixKeyType('CPF');
                            }
                            setPixModalOpen(true);
                          }
                        }}
                        className="w-full appearance-none bg-white border-2 border-primary focus:border-primary/50 rounded-xl py-2 px-4 text-primary outline-none transition-all font-black text-sm cursor-pointer shadow-sm disabled:opacity-70"
                      >
                        <option value="">Selecione</option>
                        {existingOperations.map(op => (
                          <option key={op} value={op}>{op}</option>
                        ))}
                        <option value="PIX" className="font-black text-success bg-slate-50">PIX</option>
                        <option value="OUTRO" className="font-black text-accent bg-slate-50">+ OUTRO (CADASTRAR NOVO)</option>
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40 pointer-events-none" />
                    </div>
                  </div>

                  {selectedOperationOption === 'OUTRO' && (
                    <div className="space-y-1 group md:col-span-2 animate-in slide-in-from-top-1 duration-200">
                      <label className="text-[11px] font-black uppercase tracking-widest text-dark/70 px-2">Nova Operação / Tipo de Conta</label>
                      <input
                        type="text"
                        required
                        disabled={isReadOnly}
                        value={customOperationValue}
                        onChange={(e) => setCustomOperationValue(e.target.value)}
                        className="w-full bg-white border-2 border-primary focus:border-primary/50 rounded-xl py-2 px-4 text-primary outline-none transition-all font-black text-sm shadow-sm"
                        placeholder="Ex: CONTA FÁCIL, 022, POUPANÇA INTEGRADA"
                      />
                    </div>
                  )}

                  {selectedOperationOption === 'PIX' && (
                    <div className="space-y-1 group md:col-span-2 animate-in slide-in-from-top-1 duration-200">
                      <div className="bg-success/5 border border-success/10 rounded-2xl p-4 flex items-center justify-between gap-4">
                        <div className="space-y-0.5">
                          <span className="text-[9px] font-black text-success uppercase tracking-widest">Chave PIX Configurada</span>
                          <p className="font-black text-dark text-xs uppercase">{pixKeyType}: <span className="font-mono text-primary select-all">{pixKeyValue || 'Não definida'}</span></p>
                        </div>
                        {!isReadOnly && (
                          <button
                            type="button"
                            onClick={() => setPixModalOpen(true)}
                            className="px-4 py-2 !bg-success !text-white hover:!bg-success/90 rounded-xl font-black uppercase tracking-wider text-[10px] transition-all active:scale-95 cursor-pointer shadow-md shadow-success/20"
                          >
                            Configurar Chave
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-2 flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => setModalOpen(false)} 
                    className="flex-1 !bg-primary !text-white px-4 py-3 rounded-xl font-black uppercase tracking-widest text-[11px] hover:!bg-dark transition-all shadow-lg shadow-primary/20"
                  >
                    Fechar
                  </button>
                  
                  {isReadOnly ? (
                    <button 
                      type="button" 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsReadOnly(false);
                      }}
                      className="flex-1 !bg-primary !text-white px-4 py-3 rounded-xl font-black uppercase tracking-widest text-[11px] hover:!bg-dark transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                    >
                      <Edit2 className="w-4 h-4" />
                      Editar
                    </button>
                  ) : (
                    <button 
                      type="submit"
                      className="flex-1 !bg-primary !text-white px-4 py-3 rounded-xl font-black uppercase tracking-widest text-[11px] hover:!bg-dark transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      Salvar
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* New Bank Modal */}
      {isBankModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-dark/40 backdrop-blur-md animate-in fade-in">
          <div className="bg-white rounded-[32px] w-full max-w-sm shadow-2xl relative animate-in zoom-in-95 border border-white/20 flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-black text-dark uppercase tracking-tight italic">Cadastrar <span className="text-primary not-italic">Novo Banco</span></h3>
              <button onClick={() => setBankModalOpen(false)} className="p-2 bg-slate-50 rounded-xl text-secondary/30 hover:text-danger transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const nome = formData.get('nome_banco') as string;
                  const codigo = formData.get('codigo_banco') as string;

                  try {
                    const newBank: Partial<Bank> = {
                      nome: nome.toUpperCase(),
                      codigo
                    };
                    await storage.saveBank(newBank);
                    await loadData();
                    setSelectedBank(nome.toUpperCase());
                    setBankModalOpen(false);
                    showToast('Novo banco cadastrado e selecionado!', 'success');
                  } catch (err: any) {
                    showToast(err.message, 'error');
                  }
                }}
                className="space-y-4"
              >
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-dark/70 px-1">Nome do Banco</label>
                  <input 
                    name="nome_banco"
                    required
                    placeholder="Ex: NUBANK"
                    className="w-full bg-white border-2 border-primary rounded-xl py-2 px-4 text-primary font-black text-sm outline-none transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-dark/70 px-1">Código (Opcional)</label>
                  <input 
                    name="codigo_banco"
                    placeholder="Ex: 260"
                    className="w-full bg-white border-2 border-primary rounded-xl py-2 px-4 text-primary font-black text-sm outline-none transition-all"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setBankModalOpen(false)} className="flex-1 !bg-primary !text-white font-black uppercase tracking-widest text-[10px] py-3 rounded-xl hover:!bg-dark transition-all shadow-lg shadow-primary/20">
                    Cancelar
                  </button>
                  <button type="submit" className="flex-1 !bg-primary !text-white font-black uppercase tracking-widest text-[10px] py-3 rounded-xl shadow-lg shadow-primary/20 hover:!bg-dark transition-all">
                    Salvar Banco
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Pequeno Modal do PIX */}
      {isPixModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-dark/65 backdrop-blur-md animate-in fade-in">
          <div className="bg-white rounded-[24px] w-full max-w-sm shadow-2xl relative animate-in zoom-in-95 border border-slate-100 flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-md font-black text-dark uppercase tracking-tight italic">
                Configurar <span className="text-primary not-italic">Chave PIX</span>
              </h3>
              <button 
                type="button" 
                onClick={() => {
                  setPixModalOpen(false);
                  if (!pixKeyValue) setSelectedOperationOption('');
                }} 
                className="p-1.5 bg-slate-50 rounded-lg text-secondary/30 hover:text-danger transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-dark/70 px-1">Tipo de Chave</label>
                <select
                  value={pixKeyType}
                  onChange={(e) => {
                    const type = e.target.value as any;
                    setPixKeyType(type);
                    if (type === 'CPF' && cpfValue && cpfValue !== '000.000.000-00') {
                      setPixKeyValue(cpfValue);
                    } else if (type === 'CPF') {
                      setPixKeyValue('');
                    }
                  }}
                  className="w-full bg-white border-2 border-primary rounded-xl py-2 px-3 text-primary font-black text-xs outline-none"
                >
                  <option value="CPF">CPF</option>
                  <option value="TELEFONE">TELEFONE</option>
                  <option value="EMAIL">E-MAIL</option>
                  <option value="CHAVE ALEATÓRIA">CHAVE ALEATÓRIA</option>
                </select>
              </div>
              
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-dark/70 px-1">Valor da Chave</label>
                <input
                  type="text"
                  required
                  value={pixKeyValue}
                  onChange={(e) => setPixKeyValue(e.target.value)}
                  placeholder={
                    pixKeyType === 'CPF' ? '000.000.000-00' :
                    pixKeyType === 'TELEFONE' ? '(00) 00000-0000' :
                    pixKeyType === 'EMAIL' ? 'exemplo@email.com' :
                    'Chave aleatória de 36 caracteres'
                  }
                  className="w-full bg-white border-2 border-primary rounded-xl py-2 px-3 text-primary font-black text-xs outline-none"
                />
              </div>
              
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setPixModalOpen(false);
                    if (!pixKeyValue) setSelectedOperationOption('');
                  }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-secondary font-black uppercase text-[10px] py-2.5 rounded-lg tracking-wider"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!pixKeyValue.trim()) {
                      alert('Por favor, insira o valor da chave PIX.');
                      return;
                    }
                    setPixModalOpen(false);
                    // Clear bank fields automatically
                    setSelectedBank('');
                  }}
                  className="flex-1 !bg-success !text-white hover:!bg-success/90 font-black uppercase text-[10px] py-2.5 rounded-lg tracking-wider transition-all active:scale-95 shadow-md shadow-success/20 cursor-pointer"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Excel/CSV Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-dark/60 backdrop-blur-xl animate-in fade-in">
          <div className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl relative animate-in zoom-in-95 border border-white/20 flex flex-col overflow-hidden my-auto p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-dark tracking-tight uppercase italic leading-none">
                  Importar <span className="text-primary not-italic">Colaboradores</span>
                </h2>
                <p className="text-[8px] font-bold text-secondary/40 uppercase tracking-widest mt-1">Carregar Planilha Excel ou CSV</p>
              </div>
              <button 
                onClick={() => setImportModalOpen(false)}
                disabled={isImporting}
                className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-secondary/30 hover:text-primary transition-all cursor-pointer disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {importError && (
              <div className="flex items-start gap-3 bg-rose-50 border border-rose-100 p-3 rounded-2xl text-[10px] font-black text-rose-800 uppercase tracking-tight">
                <AlertTriangle className="w-4 h-4 text-rose-700 flex-shrink-0 mt-0.5" />
                <span>{importError}</span>
              </div>
            )}

            {!isImporting ? (
              <div className="space-y-4">
                <div 
                  onClick={() => importFileInputRef.current?.click()}
                  className="border-2 border-dashed border-primary/25 hover:border-primary/50 bg-slate-50/50 hover:bg-slate-50 rounded-[24px] p-8 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer group shadow-inner"
                >
                  <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-xs font-black text-dark uppercase tracking-tight">Escolha ou arraste o arquivo</p>
                    <p className="text-[9px] font-black text-secondary/40 uppercase tracking-widest">Suporta planilhas Excel (.xlsx, .xlsm) ou CSV</p>
                  </div>
                  <input 
                    type="file" 
                    ref={importFileInputRef}
                    onChange={handleImportFile}
                    accept=".xlsx,.xlsm,.csv" 
                    className="hidden" 
                  />
                </div>

                <div className="p-3.5 bg-amber-500/5 border border-amber-500/10 rounded-2xl space-y-1.5">
                  <p className="text-[8px] font-black text-amber-800 uppercase tracking-widest flex items-center gap-1.5 leading-none">
                    <AlertCircle className="w-3.5 h-3.5" /> Dicas para Mapeamento Perfeito
                  </p>
                  <ul className="text-[9px] font-bold text-amber-900/60 list-disc list-inside space-y-0.5 leading-normal">
                    <li>O sistema identifica colunas com nomes como: <strong>ID, Nome/Beneficiário, CPF, Banco, Agência, Conta e OP</strong>.</li>
                    <li><strong>CPFs Ausentes ou Inválidos:</strong> Colaboradores sem CPF cadastrado, com CPFs inconsistentes ou errados, receberão automaticamente o valor "000.000.000-00" (zerado).</li>
                    <li><strong>ID Sequencial:</strong> IDs vazios serão gerados de forma sequencial.</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="p-6 flex flex-col items-center justify-center space-y-4">
                <div className="relative w-20 h-20 flex items-center justify-center">
                  <Loader2 className="w-12 h-12 text-primary animate-spin absolute" />
                  <span className="font-black text-xs text-primary leading-none mt-1">{importProgress}%</span>
                </div>
                <div className="text-center space-y-1.5 w-full">
                  <p className="text-xs font-black text-dark uppercase tracking-tight">Importando dados para o servidor...</p>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden shadow-inner border border-slate-200">
                    <div 
                      className="bg-primary h-full rounded-full transition-all duration-300"
                      style={{ width: `${importProgress}%` }}
                    />
                  </div>
                  <p className="text-[8px] font-black text-secondary/40 uppercase tracking-widest">Não feche esta tela até a conclusão</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
