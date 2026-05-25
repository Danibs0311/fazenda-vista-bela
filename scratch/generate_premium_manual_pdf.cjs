const { jsPDF } = require('jspdf');
const fs = require('fs');
const path = require('path');

const doc = new jsPDF({
  orientation: 'portrait',
  unit: 'mm',
  format: 'a4'
});

// Cores do Tema da Fazenda
const primaryColor = { r: 47, g: 93, b: 80 };     // #2F5D50 - Verde Floresta
const secondaryColor = { r: 111, g: 78, b: 55 };  // #6F4E37 - Café
const accentColor = { r: 192, g: 139, b: 92 };    // #C08B5C - Terracota / Ouro
const darkTextColor = { r: 31, g: 36, b: 33 };    // #1F2421 - Carvão
const creamColor = { r: 245, g: 241, b: 234 };     // #F5F1EA - Creme
const whiteColor = { r: 255, g: 255, b: 255 };
const mutedColor = { r: 120, g: 120, b: 120 };

let currentPage = 1;

// Desenha a borda e rodapé padrão
function drawPageDecorations(doc, title) {
  const pageCount = doc.internal.getNumberOfPages();
  
  // Ignora decorações na Capa (Página 1)
  if (pageCount === 1) return;

  // Borda fina elegante
  doc.setDrawColor(accentColor.r, accentColor.g, accentColor.b);
  doc.setLineWidth(0.3);
  doc.rect(8, 8, 194, 281); // Borda A4

  // Cabeçalho
  doc.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
  doc.rect(8, 8, 194, 10, 'F');
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(whiteColor.r, whiteColor.g, whiteColor.b);
  doc.text("FAZENDA VISTA BELA - MANUAL DO USUÁRIO & ADMINISTRADOR", 12, 14.5);
  
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor(accentColor.r, accentColor.g, accentColor.b);
  doc.text("DGTech Soluções Tecnológicas", 192, 14.5, { align: 'right' });

  // Rodapé
  doc.setFillColor(creamColor.r, creamColor.g, creamColor.b);
  doc.rect(8, 279, 194, 10, 'F');

  doc.setDrawColor(accentColor.r, accentColor.g, accentColor.b);
  doc.setLineWidth(0.3);
  doc.line(8, 279, 202, 279);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(secondaryColor.r, secondaryColor.g, secondaryColor.b);
  doc.text("Desenvolvido por DGTECH SOLUÇÕES TECNOLÓGICAS - Contato: comercial@dgtech.com.br", 12, 285.5);
  
  doc.setFont("helvetica", "bold");
  doc.text(`Página ${pageCount}`, 192, 285.5, { align: 'right' });
}

// -------------------------------------------------------------
// PÁGINA 1: CAPA PREMIUM E MARKETING DGTECH
// -------------------------------------------------------------
function drawCover(doc) {
  // Fundo Creme Completo
  doc.setFillColor(creamColor.r, creamColor.g, creamColor.b);
  doc.rect(0, 0, 210, 297, 'F');

  // Faixa de Destaque Superior Verde Floresta
  doc.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
  doc.rect(0, 0, 210, 110, 'F');

  // Linha divisor Ouro / Terracota
  doc.setFillColor(accentColor.r, accentColor.g, accentColor.b);
  doc.rect(0, 110, 210, 4, 'F');

  // Textos da Capa (Branco no verde)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(accentColor.r, accentColor.g, accentColor.b);
  doc.text("SISTEMA DE GESTÃO E PRODUTIVIDADE AGRÍCOLA", 105, 35, { align: 'center' });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(whiteColor.r, whiteColor.g, whiteColor.b);
  doc.text("FAZENDA VISTA BELA", 105, 55, { align: 'center' });

  doc.setFont("helvetica", "italic");
  doc.setFontSize(12);
  doc.setTextColor(creamColor.r, creamColor.g, creamColor.b);
  doc.text("Manual Oficial do Usuário e do Administrador", 105, 68, { align: 'center' });

  // Badge de Edição Premium
  doc.setFillColor(accentColor.r, accentColor.g, accentColor.b);
  doc.rect(75, 82, 60, 8, 'F');
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(whiteColor.r, whiteColor.g, whiteColor.b);
  doc.text("VERSÃO PREMIUM 2026", 105, 87, { align: 'center' });

  // Corpo da Capa (Texto escuro no Creme)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(secondaryColor.r, secondaryColor.g, secondaryColor.b);
  doc.text("Módulos de Controle Inclusos:", 105, 140, { align: 'center' });

  const modules = [
    "• Dashboard Operacional e Estatísticas de Campo",
    "• Controle de Colaboradores e CPF (Validação LGPD)",
    "• Lançamento Diário de Pesagem de Safra / Latas",
    "• Fechamento Semanal de Ciclos e Trava de Segurança",
    "• Relatórios PDF de Pagamentos agrupados por Bancos",
    "• Sistema de Backup e Restauração Criptografados (AES-256)"
  ];

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(darkTextColor.r, darkTextColor.g, darkTextColor.b);
  let yPos = 152;
  modules.forEach(m => {
    doc.text(m, 45, yPos);
    yPos += 8;
  });

  // Caixa de Divulgação de Marketing da DGTech no Rodapé
  doc.setFillColor(whiteColor.r, whiteColor.g, whiteColor.b);
  doc.setDrawColor(accentColor.r, accentColor.g, accentColor.b);
  doc.setLineWidth(0.5);
  doc.rect(20, 215, 170, 48, 'FD'); // Retângulo com fundo branco e borda ouro

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
  doc.text("DESENVOLVIDO POR: DGTECH SOLUÇÕES TECNOLÓGICAS", 105, 224, { align: 'center' });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(darkTextColor.r, darkTextColor.g, darkTextColor.b);
  doc.text("Criamos soluções sob medida de alta segurança, performance e design premium", 105, 231, { align: 'center' });
  doc.text("para otimizar as operações do agronegócio e automatizar processos financeiros.", 105, 236, { align: 'center' });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(secondaryColor.r, secondaryColor.g, secondaryColor.b);
  doc.text("Site: www.dgtech.com.br  │  Contato: comercial@dgtech.com.br", 105, 246, { align: 'center' });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(mutedColor.r, mutedColor.g, mutedColor.b);
  doc.text("Este manual é de uso exclusivo da administração da Fazenda Vista Bela. Todos os direitos reservados. 2026.", 105, 256, { align: 'center' });
}

// -------------------------------------------------------------
// PÁGINAS DE CONTEÚDO
// -------------------------------------------------------------
function addChapterPage(doc, chapterTitle, sections) {
  doc.addPage();
  drawPageDecorations(doc);

  // Título do Capítulo
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
  doc.text(chapterTitle.toUpperCase(), 15, 28);

  // Linha abaixo do título
  doc.setDrawColor(accentColor.r, accentColor.g, accentColor.b);
  doc.setLineWidth(0.5);
  doc.line(15, 31, 195, 31);

  let y = 40;

  sections.forEach(sec => {
    // Título da Seção
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(secondaryColor.r, secondaryColor.g, secondaryColor.b);
    doc.text(sec.title, 15, y);
    y += 5.5;

    // Conteúdo da Seção
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(darkTextColor.r, darkTextColor.g, darkTextColor.b);
    
    sec.paragraphs.forEach(p => {
      // Ajuste automático de quebra de texto para caber nas margens
      const lines = doc.splitTextToSize(p, 178);
      lines.forEach(l => {
        if (y > 268) {
          doc.addPage();
          drawPageDecorations(doc);
          y = 30; // reset y para o topo da nova página
        }
        
        // Verifica se é um item de lista (bullet point) ou texto normal
        if (l.trim().startsWith('•') || l.trim().startsWith('-')) {
          doc.setFont("helvetica", "bold");
          doc.text(l, 15, y);
          doc.setFont("helvetica", "normal");
        } else if (l.trim().startsWith('NOTA:') || l.trim().startsWith('ATENÇÃO:')) {
          // Caixa de Alerta especial
          doc.setFillColor(creamColor.r, creamColor.g, creamColor.b);
          doc.rect(14, y - 3.5, 180, 5.5, 'F');
          doc.setFont("helvetica", "bold");
          doc.setTextColor(accentColor.r, accentColor.g, accentColor.b);
          doc.text(l, 16, y);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(darkTextColor.r, darkTextColor.g, darkTextColor.b);
        } else {
          doc.text(l, 15, y);
        }
        y += 4.5;
      });
      y += 2.5; // Espaço entre parágrafos
    });
    y += 4; // Espaço entre seções
  });
}

// Executa a escrita de dados estruturados
drawCover(doc);

// Capítulo 1
addChapterPage(doc, "1. Painel de Controle e Gestão de Pessoas", [
  {
    title: "1.1 Dashboard Geral (Painel de Monitoramento)",
    paragraphs: [
      "O Dashboard é o cérebro operacional do sistema. Nele, você visualiza em tempo real a performance global da colheita através de 4 blocos de estatísticas rápidas e um gráfico interativo:",
      "• Total de Colaboradores: Quantidade total de colhedores cadastrados e ativos.",
      "• Latas Colhidas (Semana): O somatório de latas registradas no ciclo corrente.",
      "• Preço da Lata (Hoje): O valor operacional pago por lata configurado para o dia corrente.",
      "• Estimativa de Folha de Pagamento: O valor acumulado da semana para facilitar o fluxo de caixa.",
      "O gráfico de linhas mapeia a produtividade diária de forma intuitiva, exibindo exatamente em quais dias da semana o rendimento foi maior ou menor."
    ]
  },
  {
    title: "1.2 Ficha Cadastral dos Colaboradores",
    paragraphs: [
      "Para gerenciar os trabalhadores e seus dados bancários, acesse o painel 'Colaboradores'.",
      "• Como Cadastrar Novo: Clique em 'Novo Colaborador' (ícone '+'). Insira o nome, CPF e dados bancários.",
      "ATENÇÃO: O sistema valida o CPF por meio de cálculos matemáticos de verificação digital oficiais e impede o cadastro de CPFs inválidos ou duplicados no banco de dados para segurança jurídica.",
      "• Cadastro de Novos Bancos: Caso o banco do colaborador não esteja listado, selecione a opção '+ OUTRO' no formulário do colaborador para abrir um pop-up de inserção de novas instituições. O banco criado ficará disponível e selecionado na hora!",
      "• Modo de Leitura Seguro: Para evitar alterações indesejadas pelo toque na tela do celular, a ficha de cadastro abre por padrão em modo de visualização. Para editar, clique no botão azul 'Editar' no rodapé do modal."
    ]
  }
]);

// Capítulo 2
addChapterPage(doc, "2. Rotina de Campo, Ciclos e Pagamento", [
  {
    title: "2.1 Lançamento Diário de Colheita (Pesagem na Roça)",
    paragraphs: [
      "A tela de lançamentos foi otimizada para o trabalho sob condições difíceis de campo (luz solar, poeira, etc.):",
      "1. Selecione a data correspondente da colheita (por padrão, vem a data de hoje).",
      "2. Digite as primeiras letras do nome do colaborador na pesquisa rápida para identificá-lo.",
      "3. Informe a quantidade de latas colhidas e clique em 'Lançar Colheita'. O sistema consulta em tempo real o preço da lata cadastrado para aquela data e faz o cálculo automático do dia.",
      "NOTA: O lançamento aparecerá na tabela inferior e pode ser editado ou excluído livremente enquanto a semana correspondente estiver aberta."
    ]
  },
  {
    title: "2.2 Ciclos de Colheita (Gestão Contábil de Semanas)",
    paragraphs: [
      "O sistema agrupa os dados de forma semanal (segunda a domingo) por meio dos 'Ciclos de Colheita'.",
      "• Bloqueio Automático: Uma semana com status 'ABERTA' aceita registros. Ao final da semana, o administrador deve alterar o status para 'FECHADA' ou 'PAGA'.",
      "ATENÇÃO: Ao fechar a semana, o sistema bloqueia qualquer exclusão, edição ou inserção de dados naquele período. Isso blinda as contas e evita fraudes de dados históricos após os cálculos da folha."
    ]
  },
  {
    title: "2.3 Folha de Pagamento Contábil e PDF para Bancos",
    paragraphs: [
      "Processar os pagamentos semanais ficou extremamente rápido e simples:",
      "1. Selecione a semana de fechamento no menu de Pagamentos.",
      "2. O sistema lista o total de latas e o valor líquido a pagar a cada trabalhador.",
      "3. Use o Filtro por Banco para visualizar os depósitos de forma isolada.",
      "4. Clique em 'Download Relatório PDF': O sistema gerará um PDF profissional, organizado e dividido por seções de bancos de destino (ex: Banco do Brasil, Caixa, Bradesco, etc.).",
      "• Benefício Comercial: O administrador abre o PDF no computador/celular e realiza as transferências bancárias em lote de forma sequencial no internet banking, eliminando rascunhos em papel."
    ]
  }
]);

// Capítulo 3
addChapterPage(doc, "3. Configurações Avançadas e Backup Criptografado", [
  {
    title: "3.1 Gestão de Preço e Vigência Retroativa",
    paragraphs: [
      "Na tela de Ajustes, você define o preço pago por lata de forma flexível:",
      "• Atualização Inteligente (Upsert): Se você definir um novo valor para uma data que já possui preço cadastrado, o sistema não cria uma linha redundante; ele atualiza o preço na mesma linha, evitando bagunça.",
      "• Efeito Retroativo: Inserir um preço no passado se aplica a novos lançamentos retroativos. Registros de colheitas anteriores já salvas ficam congeladas por segurança, mas se você clicar em 'Editar' e salvar aquela colheita antiga novamente, o sistema recalculará o valor com base no novo preço retroativo!"
    ]
  },
  {
    title: "3.2 Cópias de Segurança e Restauração Criptografada (AES-256)",
    paragraphs: [
      "Para garantir que a fazenda nunca perca seus dados históricos ou cadastros, implementamos o módulo de segurança DGTech:",
      "• Como exportar Backup: Clique em 'Backup'. O sistema perguntará se deseja encriptar com senha (altamente recomendado). Se escolher sim, defina a senha. O arquivo será encriptado com criptografia simétrica de nível bancário/militar AES-GCM de 256 bits via algoritmos nativos (PBKDF2 com 100 mil iterações) e baixado em formato '.json'.",
      "• Como restaurar Backup: Clique em 'Restaurar' e selecione o arquivo. Se o backup estiver criptografado, o painel solicitará a senha. Digite-a para decifrar a carga útil e atualizar o banco de dados Supabase na nuvem em lote.",
      "NOTA: O sistema de restauração é retrocompatível e aceita backups legados ou criados sem senha normalmente."
    ]
  }
]);

// Escreve o PDF no Workspace
const buffer = doc.output('arraybuffer');
const targetPath = 'c:\\Users\\danie\\OneDrive\\Área de Trabalho\\fazenda-vista-bela---gestão-de-colheita\\manual_usuario_vista_bela.pdf';

fs.writeFileSync(targetPath, Buffer.from(buffer));
console.log('PDF generated successfully at:', targetPath);

// Copia o PDF para o diretório de artefatos para exibição local
const artifactDir = 'C:\\Users\\danie\\.gemini\\antigravity-ide\\brain\\0bb86b8e-d3a8-4c03-9af3-62db33fadca4';
const artifactPath = path.join(artifactDir, 'manual_usuario_vista_bela.pdf');
fs.writeFileSync(artifactPath, Buffer.from(buffer));
console.log('PDF copied to artifacts successfully at:', artifactPath);
