/**
 * Parser de enderecos de igrejas SDARM
 * Entrada: texto bruto do sistema GS 4.1
 * Saida: SQL INSERT statements para tabela igrejas
 */

const fs = require('fs');

const raw = fs.readFileSync(__dirname + '/igrejas-raw.txt', 'utf8');

const lines = raw.split('\n')
  .map(l => l.trim())
  .filter(l => l.length > 5 && l.includes(','));

const UNIAO_NNE_ID = 'a0000000-0000-0000-0000-000000000001';

// Map state -> known association
const STATE_ASSOC = {
  'PA': { id: 'b0000000-0000-0000-0000-000000000001', nome: 'ASPAR' },
};

function escSQL(s) {
  if (!s) return 'NULL';
  return "'" + s.replace(/'/g, "''").trim() + "'";
}

function parseIgreja(line) {
  // General format: Cidade, UF - Rua XXX - Bairro - CEP XXXXX-XXX - Tel. XXXXXXX
  // or: Cidade , UF - ...
  // Handle leading/trailing spaces
  line = line.trim();

  // Extract phone (Tel. or Tel:)
  let telefone = null;
  const telMatch = line.match(/[-–]\s*Tel\.?\s*[:.]?\s*(.+?)$/i);
  if (telMatch) {
    telefone = telMatch[1].trim();
    line = line.substring(0, line.indexOf(telMatch[0])).trim();
    // Remove trailing " - " if any
    line = line.replace(/\s*[-–]\s*$/, '');
  }

  // Extract CEP
  let cep = null;
  const cepMatch = line.match(/[-–]\s*CEP\s+(\d{5}-?\d{3})/i);
  if (cepMatch) {
    cep = cepMatch[1];
    line = line.substring(0, line.indexOf(cepMatch[0])).trim();
    line = line.replace(/\s*[-–]\s*$/, '');
  } else {
    // Try standalone CEP pattern
    const cepMatch2 = line.match(/CEP\s+(\d{5}-?\d{3})/i);
    if (cepMatch2) {
      cep = cepMatch2[1];
      line = line.replace(cepMatch2[0], '').trim();
      line = line.replace(/\s*[-–]\s*$/, '');
    }
  }

  // Split by " - " to get parts
  const parts = line.split(/\s+-\s+/).map(p => p.trim()).filter(Boolean);

  if (parts.length < 1) return null;

  // First part: "Cidade, UF" or "Cidade , UF"
  const firstPart = parts[0];
  const cityStateMatch = firstPart.match(/^(.+?)\s*,\s*([A-Z]{2})\s*$/);

  let cidade, estado;
  if (cityStateMatch) {
    cidade = cityStateMatch[1].trim();
    estado = cityStateMatch[2].trim();
  } else {
    // Try without state
    const cityOnlyMatch = firstPart.match(/^(.+?)\s*,\s*$/);
    if (cityOnlyMatch) {
      cidade = cityOnlyMatch[1].trim();
      estado = null;
    } else {
      // Last resort: just use the whole thing as city
      cidade = firstPart.replace(/,\s*$/, '').trim();
      estado = null;
    }
  }

  // Remaining parts: address and bairro
  let endereco_rua = null;
  let endereco_numero = null;
  let endereco_bairro = null;
  let complemento = null;

  if (parts.length >= 3) {
    // parts[1] = address, parts[2] = bairro
    const addrPart = parts[1];
    endereco_bairro = parts[2];

    // If there are more parts, they might be extra info
    if (parts.length > 3) {
      // Check if parts[3+] contain useful info
      for (let i = 3; i < parts.length; i++) {
        if (!complemento) complemento = parts[i];
        else complemento += ' - ' + parts[i];
      }
    }

    // Try to extract number from address
    const numMatch = addrPart.match(/^(.+?)\s*[,.]?\s*(?:Nº?\s*|N\s+|n\s+)?(\d+[\w-]*)(?:\s|$)/);
    if (numMatch) {
      // Check if the number is embedded in the street name
      const streetWithNum = addrPart.match(/^(.+?)\s*[,.]?\s*(\d+[\w/-]*)(.*)$/);
      if (streetWithNum) {
        endereco_rua = streetWithNum[1].trim().replace(/[,.]$/, '');
        endereco_numero = streetWithNum[2].trim();
        if (streetWithNum[3] && streetWithNum[3].trim()) {
          complemento = streetWithNum[3].trim().replace(/^[,.\s]+/, '');
        }
      } else {
        endereco_rua = addrPart;
      }
    } else {
      endereco_rua = addrPart;
    }
  } else if (parts.length === 2) {
    // parts[1] could be address or bairro
    const addrPart = parts[1];
    if (addrPart.match(/^(Rua|Av|Avenida|R\.|Tv|Travessa|Rod|Estrada|Qd|Quadra|Praça|Largo|Alameda|Sitio|Sítio)/i)) {
      endereco_rua = addrPart;
    } else {
      endereco_bairro = addrPart;
    }
  }

  // Build church name
  let nome;
  if (endereco_bairro) {
    nome = `Igreja ${cidade} - ${endereco_bairro}`;
  } else {
    nome = `Igreja ${cidade}`;
  }

  // Clean up complemento
  if (complemento) {
    // Remove things that look like they were already extracted
    complemento = complemento.replace(/CEP\s+\d{5}-?\d{3}/gi, '').trim();
    complemento = complemento.replace(/Tel\.?\s*.*/gi, '').trim();
    if (complemento.length < 2) complemento = null;
  }

  return {
    nome,
    endereco_rua: endereco_rua ? endereco_rua.substring(0, 200) : null,
    endereco_numero,
    endereco_complemento: complemento,
    endereco_bairro,
    endereco_cidade: cidade,
    endereco_estado: estado,
    endereco_cep: cep,
    telefone,
  };
}

const igrejas = [];
for (const line of lines) {
  const parsed = parseIgreja(line);
  if (parsed && parsed.endereco_cidade) {
    igrejas.push(parsed);
  }
}

console.log(`Parsed ${igrejas.length} churches`);

// Count by state
const byState = {};
for (const ig of igrejas) {
  const st = ig.endereco_estado || '??';
  byState[st] = (byState[st] || 0) + 1;
}
console.log('\nBy state:');
Object.entries(byState).sort((a, b) => b[1] - a[1]).forEach(([st, cnt]) => {
  console.log(`  ${st}: ${cnt}`);
});

// Generate SQL
let sql = `-- ============================================================
-- Migration 010: Seed de ${igrejas.length} igrejas (enderecos SDARM)
-- Fonte: Sistema GS 4.1 - Enderecos Igrejas (Uniao)
-- ============================================================

`;

for (let i = 0; i < igrejas.length; i++) {
  const ig = igrejas[i];
  const assoc = STATE_ASSOC[ig.endereco_estado];

  sql += `INSERT INTO igrejas (nome, uniao_id, associacao_id, endereco_rua, endereco_numero, endereco_complemento, endereco_bairro, endereco_cidade, endereco_estado, endereco_cep, telefone, ativo)
VALUES (
  ${escSQL(ig.nome)},
  '${UNIAO_NNE_ID}',
  ${assoc ? "'" + assoc.id + "'" : 'NULL'},
  ${escSQL(ig.endereco_rua)},
  ${escSQL(ig.endereco_numero)},
  ${escSQL(ig.endereco_complemento)},
  ${escSQL(ig.endereco_bairro)},
  ${escSQL(ig.endereco_cidade)},
  ${escSQL(ig.endereco_estado)},
  ${escSQL(ig.endereco_cep)},
  ${escSQL(ig.telefone)},
  true
);\n\n`;
}

fs.writeFileSync(__dirname + '/../supabase-migrations/010_seed_igrejas.sql', sql, 'utf8');
console.log(`\nSQL written to supabase-migrations/010_seed_igrejas.sql`);
console.log(`Total INSERT statements: ${igrejas.length}`);
