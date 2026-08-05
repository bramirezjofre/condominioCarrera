import { ROLES, PERMISSIONS } from './roles.js';
import { nextId, dateMinusDaysISO, datePlusDaysISO, todayISO } from './ids.js';

export function buildDemoData() {
  const condominiumId = nextId('cond');
  const torre1Id = nextId('tow');
  const torre2Id = nextId('tow');
  const torre3Id = nextId('tow');

  const towers = [
    {
      id: torre1Id,
      condominiumId,
      name: 'Torre Norte',
      code: 'T-NORTE',
      addressDetail: 'Av. Libertador 1234',
      floorCount: 12,
      active: true
    },
    {
      id: torre2Id,
      condominiumId,
      name: 'Torre Sur',
      code: 'T-SUR',
      addressDetail: 'Av. Libertador 1300',
      floorCount: 10,
      active: true
    },
    {
      id: torre3Id,
      condominiumId,
      name: 'Torre Poniente',
      code: 'T-PONIENTE',
      addressDetail: 'Av. Libertador 1450',
      floorCount: 8,
      active: true
    }
  ];

  const units = [];
  const unitTemplates = [
    { tower: torre1Id, letters: ['A', 'B', 'C'], perFloor: 3, floors: 12 },
    { tower: torre2Id, letters: ['A', 'B'], perFloor: 2, floors: 10 },
    { tower: torre3Id, letters: ['A', 'B', 'C'], perFloor: 3, floors: 8 }
  ];
  for (const t of unitTemplates) {
    for (let f = 1; f <= t.floors; f++) {
      for (let i = 0; i < t.letters.length; i++) {
        const number = `${f}${t.letters[i]}`;
        units.push({
          id: nextId('uni'),
          condominiumId,
          towerId: t.tower,
          number,
          floor: f,
          kind: 'departamento',
          prorationFactor: 0.001000 + i * 0.000200,
          areaM2: 60 + i * 8,
          active: true
        });
      }
    }
  }

  const people = [];
  const firstNames = [
    'Ana', 'Luis', 'Maria', 'Pedro', 'Camila', 'Diego', 'Sofia', 'Matias',
    'Valentina', 'Joaquin', 'Isidora', 'Tomas', 'Francisca', 'Sebastian',
    'Constanza', 'Andres', 'Catalina', 'Felipe', 'Macarena', 'Rodrigo',
    'Ignacia', 'Hernan', 'Paula', 'Carlos', 'Daniela', 'Esteban'
  ];
  const lastNames = [
    'Gonzalez', 'Muñoz', 'Rojas', 'Diaz', 'Perez', 'Soto', 'Contreras',
    'Silva', 'Martinez', 'Sepulveda', 'Morales', 'Rodriguez', 'Lopez',
    'Fuentes', 'Hernandez', 'Torres', 'Araya', 'Vargas', 'Castillo',
    'Espinoza', 'Reyes', 'Ramirez', 'Castro', 'Parra', 'Tapia'
  ];
  for (let i = 0; i < 30; i++) {
    const fn = firstNames[i % firstNames.length];
    const ln = lastNames[(i * 3) % lastNames.length];
    people.push({
      id: nextId('per'),
      firstName: fn,
      lastName: ln,
      fullName: `${fn} ${ln}`,
      nationalId: `${10_000_000 + i * 123_456}-${(i % 9) + 1}`,
      email: `${fn.toLowerCase()}.${ln.toLowerCase()}@condominio.cl`,
      phone: `+569${(20_000_000 + i * 27_391).toString().slice(0, 8)}`,
      birthDate: `19${60 + (i % 35)}-${String((i % 12) + 1).padStart(2, '0')}-15`,
      notes: '',
      active: true
    });
  }

  const occupancies = [];
  for (let i = 0; i < 25; i++) {
    const unit = units[i];
    const owner = people[i];
    const tenantIdx = i + 5 < people.length ? i + 5 : i;
    const type = i % 4 === 0 ? 'tenant' : 'owner';
    const person = type === 'tenant' ? people[tenantIdx] : owner;
    occupancies.push({
      id: nextId('occ'),
      condominiumId,
      unitId: unit.id,
      personId: person.id,
      occupancyType: type,
      isPrimary: true,
      startsOn: dateMinusDaysISO(365 * (i % 3) + 30),
      endsOn: null,
      receivesBilling: true,
      receivesNotifications: true,
      notes: ''
    });
  }

  const users = [
    {
      id: nextId('usr'),
      personId: people[0].id,
      email: 'admin@condominio.cl',
      username: 'admin',
      password: 'demo123',
      status: 'active',
      mustChangePassword: false,
      roleCodes: [ROLES.CONDOMINIUM_ADMIN],
      condominiumId,
      towerIds: [],
      unitIds: [],
      fullName: 'Ana Gonzalez',
      person: people[0]
    },
    {
      id: nextId('usr'),
      personId: people[1].id,
      email: 'torre1@condominio.cl',
      username: 'torre1',
      password: 'demo123',
      status: 'active',
      mustChangePassword: true,
      roleCodes: [ROLES.TOWER_ADMIN],
      condominiumId,
      towerIds: [torre1Id],
      unitIds: [],
      fullName: 'Luis Muñoz',
      person: people[1]
    },
    {
      id: nextId('usr'),
      personId: people[2].id,
      email: 'torre2@condominio.cl',
      username: 'torre2',
      password: 'demo123',
      status: 'active',
      mustChangePassword: false,
      roleCodes: [ROLES.TOWER_ADMIN],
      condominiumId,
      towerIds: [torre2Id],
      unitIds: [],
      fullName: 'Maria Rojas',
      person: people[2]
    },
    {
      id: nextId('usr'),
      personId: people[3].id,
      email: 'contabilidad@condominio.cl',
      username: 'contabilidad',
      password: 'demo123',
      status: 'active',
      mustChangePassword: false,
      roleCodes: [ROLES.ACCOUNTANT],
      condominiumId,
      towerIds: [],
      unitIds: [],
      fullName: 'Pedro Diaz',
      person: people[3]
    },
    {
      id: nextId('usr'),
      personId: people[4].id,
      email: 'conserjeria@condominio.cl',
      username: 'conserjeria',
      password: 'demo123',
      status: 'active',
      mustChangePassword: false,
      roleCodes: [ROLES.CONCIERGE],
      condominiumId,
      towerIds: [torre1Id, torre2Id, torre3Id],
      unitIds: [],
      fullName: 'Camila Perez',
      person: people[4]
    },
    {
      id: nextId('usr'),
      personId: people[5].id,
      email: 'comite@condominio.cl',
      username: 'comite',
      password: 'demo123',
      status: 'active',
      mustChangePassword: false,
      roleCodes: [ROLES.COMMITTEE],
      condominiumId,
      towerIds: [],
      unitIds: [],
      fullName: 'Diego Soto',
      person: people[5]
    },
    {
      id: nextId('usr'),
      personId: people[10].id,
      email: 'residente101@condominio.cl',
      username: 'residente101',
      password: 'demo123',
      status: 'active',
      mustChangePassword: false,
      roleCodes: [ROLES.RESIDENT],
      condominiumId,
      towerIds: [],
      unitIds: [units[0].id],
      fullName: 'Valentina Ramirez',
      person: people[10]
    }
  ];

  const periods = [];
  const monthNames = ['Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre'];
  for (let i = 0; i < 6; i++) {
    const monthIndex = (10 + i) % 12;
    const year = 2026;
    const total = 12_500_000 + i * 350_000;
    const status = i < 4 ? 'issued' : i === 4 ? 'draft' : 'closed';
    periods.push({
      id: nextId('per'),
      condominiumId,
      year,
      month: monthIndex + 1,
      monthName: monthNames[i],
      status,
      issueDate: dateMinusDaysISO(60 - i * 30),
      dueDate: datePlusDaysISO(15 - i * 30),
      totalAmount: total,
      notes: '',
      issuedAt: status === 'draft' ? null : dateMinusDaysISO(40 - i * 30),
      closedAt: status === 'closed' ? dateMinusDaysISO(5 - i * 30) : null
    });
  }

  const charges = [];
  for (let p = 0; p < periods.length; p++) {
    const period = periods[p];
    if (period.status === 'draft') continue;
    for (let u = 0; u < units.length; u++) {
      const isDemo = (u + p) % 11 === 0;
      const baseAmount = Math.round(period.totalAmount / units.length);
      const previous = isDemo ? 180_000 : 0;
      const fines = isDemo ? 65_000 : 0;
      const total = baseAmount + previous + fines;
      const paid = isDemo ? Math.round(paidShare(u, p)) : total;
      const balance = total - paid;
      const due = period.dueDate;
      const status = balance === 0 ? 'paid' : due < todayISO() ? 'overdue' : 'pending';
      charges.push({
        id: nextId('cha'),
        periodId: period.id,
        unitId: units[u].id,
        baseAmount,
        previousBalance: previous,
        finesAmount: fines,
        interestAmount: 0,
        discountAmount: 0,
        totalAmount: total,
        paidAmount: paid,
        balanceAmount: balance,
        status,
        dueDate: due
      });
    }
  }

  const payments = [];
  for (let i = 0; i < 25; i++) {
    const charge = charges[(i * 11) % charges.length];
    payments.push({
      id: nextId('pay'),
      condominiumId,
      unitId: charge.unitId,
      payerPersonId: people[i % 20].id,
      amount: charge.totalAmount,
      paymentMethod: ['transfer', 'cash', 'check'][i % 3],
      reference: `REF-${1000 + i}`,
      paidAt: dateMinusDaysISO(45 - i),
      status: i % 13 === 0 ? 'pending_verification' : 'verified',
      receiptPath: null,
      recordedBy: users[0].id,
      verifiedBy: i % 13 === 0 ? null : users[3].id,
      verifiedAt: i % 13 === 0 ? null : dateMinusDaysISO(40 - i),
      reversalReason: null
    });
  }

  const fines = [
    {
      id: nextId('fin'),
      condominiumId,
      unitId: units[0].id,
      personId: people[0].id,
      ruleCode: 'RUIDO',
      reason: 'Ruido excesivo despues de las 23:00',
      incidentAt: dateMinusDaysISO(15),
      amount: 80_000,
      status: 'notified',
      notes: '',
      createdBy: users[0].id,
      notifiedAt: dateMinusDaysISO(14),
      resolvedAt: null
    },
    {
      id: nextId('fin'),
      condominiumId,
      unitId: units[5].id,
      personId: people[5].id,
      ruleCode: 'MASCOTA',
      reason: 'Mascota suelta en areas comunes',
      incidentAt: dateMinusDaysISO(30),
      amount: 65_000,
      status: 'paid',
      notes: '',
      createdBy: users[1].id,
      notifiedAt: dateMinusDaysISO(28),
      resolvedAt: dateMinusDaysISO(10)
    },
    {
      id: nextId('fin'),
      condominiumId,
      unitId: units[12].id,
      personId: people[12].id,
      ruleCode: 'ESTACIONAMIENTO',
      reason: 'Estacionamiento en zona no autorizada',
      incidentAt: dateMinusDaysISO(8),
      amount: 95_000,
      status: 'appealed',
      notes: '',
      createdBy: users[0].id,
      notifiedAt: dateMinusDaysISO(7),
      resolvedAt: null
    },
    {
      id: nextId('fin'),
      condominiumId,
      unitId: units[20].id,
      personId: people[20].id,
      ruleCode: 'BASURA',
      reason: 'Residuos fuera de horario',
      incidentAt: dateMinusDaysISO(45),
      amount: 35_000,
      status: 'draft',
      notes: '',
      createdBy: users[2].id,
      notifiedAt: null,
      resolvedAt: null
    },
    {
      id: nextId('fin'),
      condominiumId,
      unitId: units[18].id,
      personId: people[18].id,
      ruleCode: 'OBRA',
      reason: 'Obra fuera de horario',
      incidentAt: dateMinusDaysISO(20),
      amount: 120_000,
      status: 'confirmed',
      notes: '',
      createdBy: users[0].id,
      notifiedAt: dateMinusDaysISO(19),
      resolvedAt: null
    },
    {
      id: nextId('fin'),
      condominiumId,
      unitId: units[8].id,
      personId: people[8].id,
      ruleCode: 'OTRO',
      reason: 'Daño en area comun',
      incidentAt: dateMinusDaysISO(70),
      amount: 220_000,
      status: 'void',
      notes: 'Anulada por error en la multa',
      createdBy: users[0].id,
      notifiedAt: dateMinusDaysISO(68),
      resolvedAt: dateMinusDaysISO(60)
    },
    {
      id: nextId('fin'),
      condominiumId,
      unitId: units[2].id,
      personId: people[2].id,
      ruleCode: 'RUIDO',
      reason: 'Música a alto volumen',
      incidentAt: dateMinusDaysISO(3),
      amount: 70_000,
      status: 'notified',
      notes: '',
      createdBy: users[1].id,
      notifiedAt: dateMinusDaysISO(2),
      resolvedAt: null
    },
    {
      id: nextId('fin'),
      condominiumId,
      unitId: units[25].id,
      personId: people[25].id,
      ruleCode: 'ESTACIONAMIENTO',
      reason: 'Bloqueo de porton',
      incidentAt: dateMinusDaysISO(11),
      amount: 90_000,
      status: 'confirmed',
      notes: '',
      createdBy: users[2].id,
      notifiedAt: dateMinusDaysISO(10),
      resolvedAt: null
    }
  ];

  const maintenance = [];
  for (let i = 0; i < 12; i++) {
    const unit = units[i * 2];
    const status = ['new', 'assigned', 'in_progress', 'in_review', 'completed', 'cancelled'][i % 6];
    const priority = ['low', 'normal', 'high', 'urgent'][i % 4];
    maintenance.push({
      id: nextId('mnt'),
      condominiumId,
      unitId: unit.id,
      createdBy: users[(i % 4) + 1].id,
      assignedTo: i % 3 === 0 ? null : users[(i % 4) + 1].id,
      category: ['ascensores', 'gasfiteria', 'electricidad', 'pintura', 'limpieza'][i % 5],
      priority,
      title: `Solicitud ${i + 1}`,
      description: 'Se requiere atencion en el area descrita.',
      status,
      scheduledFor: datePlusDaysISO(1 + i),
      completedAt: status === 'completed' ? dateMinusDaysISO(i) : null,
      closedAt: status === 'completed' ? dateMinusDaysISO(i) : null
    });
  }

  const parcels = [];
  for (let i = 0; i < 18; i++) {
    const unit = units[i];
    const status = ['received', 'notified', 'delivered', 'returned'][i % 4];
    parcels.push({
      id: nextId('par'),
      condominiumId,
      unitId: unit.id,
      recipientPersonId: people[(i + 5) % people.length].id,
      carrier: ['Starken', 'Chilexpress', 'Blue Express', 'MercadoEnvios'][i % 4],
      trackingNumber: `TRK${100000 + i}`,
      description: `Caja ${i + 1}`,
      receivedBy: users[4].id,
      receivedAt: dateMinusDaysISO(5 + i % 8),
      notifiedAt: status !== 'received' ? dateMinusDaysISO(4 + i % 8) : null,
      deliveredBy: status === 'delivered' ? users[4].id : null,
      deliveredToName: status === 'delivered' ? people[(i + 5) % people.length].fullName : null,
      deliveredAt: status === 'delivered' ? dateMinusDaysISO(2 + i % 5) : null,
      status,
      proofPath: null
    });
  }

  const documents = [];
  for (let i = 0; i < 15; i++) {
    documents.push({
      id: nextId('doc'),
      condominiumId,
      categoryId: ['reglamento', 'actas', 'financieros', 'contratos', 'manuales'][i % 5],
      title: `Documento ${i + 1}`,
      description: 'Documento institucional del condominio.',
      storagePath: `/docs/${condominiumId}/file-${i}.pdf`,
      fileName: `documento-${i + 1}.pdf`,
      mimeType: 'application/pdf',
      fileSize: 200_000 + i * 25_000,
      version: 1,
      visibility: ['administration', 'committee', 'residents', 'public'][i % 4],
      publishedAt: dateMinusDaysISO(120 - i * 5),
      expiresAt: i % 4 === 0 ? datePlusDaysISO(30) : null,
      uploadedBy: users[0].id,
      archivedAt: null
    });
  }

  const announcements = [];
  for (let i = 0; i < 10; i++) {
    const status = ['draft', 'scheduled', 'published', 'archived'][i % 4];
    announcements.push({
      id: nextId('ann'),
      condominiumId,
      title: `Aviso ${i + 1}`,
      body: 'Texto del comunicado institucional para la comunidad.',
      priority: ['low', 'normal', 'high', 'urgent'][i % 4],
      status,
      publishedAt: status === 'published' ? dateMinusDaysISO(7 - i) : null,
      expiresAt: status === 'published' ? datePlusDaysISO(14) : null,
      createdBy: users[0].id,
      targets: ['condominium']
    });
  }

  const amenities = [
    {
      id: nextId('amn'),
      condominiumId,
      name: 'Sala de eventos',
      description: 'Sala con capacidad para 50 personas.',
      capacity: 50,
      requiresApproval: true,
      price: 80_000,
      depositAmount: 100_000,
      rulesDocumentId: documents[0].id,
      active: true
    },
    {
      id: nextId('amn'),
      condominiumId,
      name: 'Piscina',
      description: 'Piscina temperada.',
      capacity: 20,
      requiresApproval: false,
      price: 0,
      depositAmount: 0,
      rulesDocumentId: null,
      active: true
    },
    {
      id: nextId('amn'),
      condominiumId,
      name: 'Quincho',
      description: 'Quincho conparrilla.',
      capacity: 15,
      requiresApproval: true,
      price: 40_000,
      depositAmount: 50_000,
      rulesDocumentId: null,
      active: true
    },
    {
      id: nextId('amn'),
      condominiumId,
      name: 'Gimnasio',
      description: 'Equipamiento basico.',
      capacity: 8,
      requiresApproval: false,
      price: 0,
      depositAmount: 0,
      rulesDocumentId: null,
      active: true
    }
  ];

  const reservations = [];
  for (let i = 0; i < 12; i++) {
    const amenity = amenities[i % amenities.length];
    const unit = units[i * 2];
    const status = ['requested', 'approved', 'rejected', 'cancelled', 'completed'][i % 5];
    reservations.push({
      id: nextId('res'),
      amenityId: amenity.id,
      unitId: unit.id,
      requestedBy: people[(i + 3) % people.length].id,
      startsAt: `${datePlusDaysISO(i)}T18:00:00`,
      endsAt: `${datePlusDaysISO(i)}T22:00:00`,
      attendeeCount: 5 + (i % 10),
      status,
      notes: '',
      approvedBy: status === 'approved' || status === 'completed' ? users[0].id : null,
      approvedAt: status === 'approved' || status === 'completed' ? dateMinusDaysISO(1) : null,
      rejectionReason: status === 'rejected' ? 'Solapamiento con otro uso' : null
    });
  }

  const notifications = [];
  for (let i = 0; i < 30; i++) {
    notifications.push({
      id: nextId('not'),
      userId: users[i % users.length].id,
      type: ['payment', 'announcement', 'maintenance', 'parcel', 'reservation'][i % 5],
      title: `Notificacion ${i + 1}`,
      body: 'Tiene una actualizacion pendiente en su cuenta.',
      link: '/app',
      readAt: i % 3 === 0 ? dateMinusDaysISO(i) : null,
      createdAt: dateMinusDaysISO(i)
    });
  }

  const audits = [];
  for (let i = 0; i < 50; i++) {
    audits.push({
      id: nextId('aud'),
      condominiumId,
      actorUserId: users[i % users.length].id,
      action: ['towers.create', 'units.create', 'people.create', 'payments.create', 'announcements.publish'][i % 5],
      entityType: ['tower', 'unit', 'person', 'payment', 'announcement'][i % 5],
      entityId: `ent_${i}`,
      createdAt: dateMinusDaysISO(i)
    });
  }

  const expenseCategories = [
    { id: nextId('cat'), condominiumId, name: 'Mantenciones', code: 'MANT', active: true },
    { id: nextId('cat'), condominiumId, name: 'Personal', code: 'PERS', active: true },
    { id: nextId('cat'), condominiumId, name: 'Servicios basicos', code: 'SERV', active: true },
    { id: nextId('cat'), condominiumId, name: 'Seguros', code: 'SEG', active: true },
    { id: nextId('cat'), condominiumId, name: 'Administracion', code: 'ADM', active: true },
    { id: nextId('cat'), condominiumId, name: 'Otros', code: 'OTROS', active: true }
  ];

  const towerTeams = [
    { id: nextId('ttm'), condominiumId, towerId: torre1Id, personId: people[1].id, userId: users[1].id, positionTitle: 'Administrador', startsOn: dateMinusDaysISO(400), endsOn: null },
    { id: nextId('ttm'), condominiumId, towerId: torre1Id, personId: people[7].id, userId: null, positionTitle: 'Conserje', startsOn: dateMinusDaysISO(200), endsOn: null },
    { id: nextId('ttm'), condominiumId, towerId: torre1Id, personId: people[8].id, userId: null, positionTitle: 'Secretaria', startsOn: dateMinusDaysISO(180), endsOn: null },
    { id: nextId('ttm'), condominiumId, towerId: torre2Id, personId: people[2].id, userId: users[2].id, positionTitle: 'Administrador', startsOn: dateMinusDaysISO(380), endsOn: null },
    { id: nextId('ttm'), condominiumId, towerId: torre2Id, personId: people[9].id, userId: null, positionTitle: 'Mantenimiento', startsOn: dateMinusDaysISO(150), endsOn: null },
    { id: nextId('ttm'), condominiumId, towerId: torre3Id, personId: people[6].id, userId: null, positionTitle: 'Administrador', startsOn: dateMinusDaysISO(120), endsOn: null }
  ];

  return {
    condominiums: [
      {
        id: condominiumId,
        name: 'Condominio Jose Miguel Carrera',
        legalName: 'Condominio Jose Miguel Carrera',
        taxId: '76.123.456-7',
        address: 'Av. Libertador Bernardo O\'Higgins 1234',
        commune: 'Santiago',
        region: 'Region Metropolitana',
        timezone: 'America/Santiago',
        currency: 'CLP',
        active: true
      }
    ],
    towers,
    units,
    people,
    occupancies,
    users,
    periods,
    charges,
    payments,
    fines,
    maintenance,
    parcels,
    documents,
    announcements,
    amenities,
    reservations,
    notifications,
    audits,
    expenseCategories,
    towerTeams,
    permissions: Object.values(PERMISSIONS).map((code) => ({
      id: `perm_${code}`,
      code
    }))
  };
}

function paidShare(unitIndex, periodIndex) {
  const overdue = (unitIndex + periodIndex) % 11 === 0;
  if (overdue) return Math.round((unitIndex * 1234 + periodIndex * 500) % 200_000);
  return 0;
}