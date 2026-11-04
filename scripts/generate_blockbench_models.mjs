import fs from 'node:fs';
import path from 'node:path';

const outDir = path.resolve(process.cwd(), 'blockbench-models');
fs.mkdirSync(outDir, { recursive: true });

/**
 * Generates a valid Blockbench 4.10 (.bbmodel) project file for Chibi Minecraft characters
 * (Head 1.2x = 9.6x9.6x9.6 units, Body = 6x6x3.5 units, Short arms/legs = 3x5x3 units)
 */
function createChibiBBModel({ id, name, primaryHex, secondaryHex, eyeHex, isCreeper = false, isEnderman = false }) {
  const headUuid = `${id}-head-cube`;
  const bodyUuid = `${id}-body-cube`;
  const armLUuid = `${id}-arml-cube`;
  const armRUuid = `${id}-armr-cube`;
  const legLUuid = `${id}-legl-cube`;
  const legRUuid = `${id}-legr-cube`;

  const elements = [
    {
      name: 'head_chibi_1_2x',
      box_uv: true,
      rescale: false,
      locked: false,
      from: [-4.8, isEnderman ? 11 : 9, -4.8],
      to: [4.8, isEnderman ? 20.6 : 18.6, 4.8],
      autouv: 1,
      color: 1,
      origin: [0, isEnderman ? 11 : 9, 0],
      uv_offset: [0, 0],
      uuid: headUuid,
      type: 'cube'
    },
    {
      name: 'body_chibi',
      box_uv: true,
      rescale: false,
      locked: false,
      from: [-3, isEnderman ? 4.5 : 4, -1.8],
      to: [3, isEnderman ? 11 : 9, 1.8],
      autouv: 1,
      color: 2,
      origin: [0, 6.5, 0],
      uv_offset: [0, 20],
      uuid: bodyUuid,
      type: 'cube'
    },
    {
      name: 'left_leg',
      box_uv: true,
      rescale: false,
      locked: false,
      from: [-2.8, 0, isCreeper ? -3.2 : -1.5],
      to: [-0.2, isEnderman ? 4.5 : 4, isCreeper ? -0.6 : 1.5],
      autouv: 1,
      color: 3,
      origin: [-1.5, 4, 0],
      uv_offset: [24, 20],
      uuid: legLUuid,
      type: 'cube'
    },
    {
      name: 'right_leg',
      box_uv: true,
      rescale: false,
      locked: false,
      from: [0.2, 0, isCreeper ? -3.2 : -1.5],
      to: [2.8, isEnderman ? 4.5 : 4, isCreeper ? -0.6 : 1.5],
      autouv: 1,
      color: 3,
      origin: [1.5, 4, 0],
      uv_offset: [36, 20],
      uuid: legRUuid,
      type: 'cube'
    },
    {
      name: isCreeper ? 'back_left_leg' : 'left_arm',
      box_uv: true,
      rescale: false,
      locked: false,
      from: isCreeper ? [-2.8, 0, 0.6] : [-5.6, 4.2, -1.4],
      to: isCreeper ? [-0.2, 4, 3.2] : [-3.0, 9.0, 1.4],
      autouv: 1,
      color: 4,
      origin: isCreeper ? [-1.5, 4, 1.8] : [-4.3, 8.8, 0],
      uv_offset: [0, 32],
      uuid: armLUuid,
      type: 'cube'
    },
    {
      name: isCreeper ? 'back_right_leg' : 'right_arm',
      box_uv: true,
      rescale: false,
      locked: false,
      from: isCreeper ? [0.2, 0, 0.6] : [3.0, 4.2, -1.4],
      to: isCreeper ? [2.8, 4, 3.2] : [5.6, 9.0, 1.4],
      autouv: 1,
      color: 4,
      origin: isCreeper ? [1.5, 4, 1.8] : [4.3, 8.8, 0],
      uv_offset: [16, 32],
      uuid: armRUuid,
      type: 'cube'
    }
  ];

  return {
    meta: {
      format_version: '4.10',
      model_format: 'free',
      box_uv: true,
      creation_time: Math.floor(Date.now() / 1000),
      author: 'AstroCyberr Monopoly Generator',
      description: `${name} — Chibi 1.2x Head Scale Voxel Model (${primaryHex}, ${secondaryHex}, ${eyeHex})`
    },
    name: `${id}_chibi`,
    model_identifier: `${id}_chibi`,
    visible_box: [1, 1.5, 0],
    variable_placeholders: '',
    resolution: { width: 64, height: 64 },
    elements,
    outliner: [
      {
        name: 'root',
        origin: [0, 0, 0],
        color: 0,
        uuid: `${id}-root-group`,
        export: true,
        mirror_uv: false,
        isOpen: true,
        locked: false,
        visibility: true,
        autouv: 0,
        children: [
          {
            name: 'head_bone',
            origin: [0, isEnderman ? 11 : 9, 0],
            uuid: `${id}-head-bone`,
            isOpen: true,
            visibility: true,
            children: [headUuid]
          },
          {
            name: 'body_bone',
            origin: [0, 6.5, 0],
            uuid: `${id}-body-bone`,
            isOpen: true,
            visibility: true,
            children: [bodyUuid]
          },
          {
            name: 'left_limb_bone',
            origin: [-4.3, 8.8, 0],
            uuid: `${id}-arml-bone`,
            isOpen: true,
            visibility: true,
            children: [armLUuid]
          },
          {
            name: 'right_limb_bone',
            origin: [4.3, 8.8, 0],
            uuid: `${id}-armr-bone`,
            isOpen: true,
            visibility: true,
            children: [armRUuid]
          },
          {
            name: 'left_leg_bone',
            origin: [-1.5, 4, 0],
            uuid: `${id}-legl-bone`,
            isOpen: true,
            visibility: true,
            children: [legLUuid]
          },
          {
            name: 'right_leg_bone',
            origin: [1.5, 4, 0],
            uuid: `${id}-legr-bone`,
            isOpen: true,
            visibility: true,
            children: [legRUuid]
          }
        ]
      }
    ],
    textures: [],
    animations: [
      {
        uuid: `${id}-anim-move`,
        name: isCreeper ? 'creeper_tnt_explode_step' : isEnderman ? 'enderman_portal_teleport' : 'chibi_parabola_hop',
        loop: 'once',
        override: false,
        length: 0.45,
        snapping: 24,
        selected: true
      }
    ]
  };
}

const characters = [
  { id: 'steve', name: 'Steve Chibi', primaryHex: '#06b6d4', secondaryHex: '#3b82f6', eyeHex: '#4f46e5' },
  { id: 'alex', name: 'Alex Chibi', primaryHex: '#22c55e', secondaryHex: '#f97316', eyeHex: '#15803d' },
  { id: 'creeper', name: 'Creeper Chibi', primaryHex: '#4ade80', secondaryHex: '#166534', eyeHex: '#111827', isCreeper: true },
  { id: 'enderman', name: 'Enderman Chibi', primaryHex: '#18181b', secondaryHex: '#a855f7', eyeHex: '#d8b4fe', isEnderman: true }
];

for (const char of characters) {
  const model = createChibiBBModel(char);
  const filePath = path.join(outDir, `${char.id}_chibi.bbmodel`);
  fs.writeFileSync(filePath, JSON.stringify(model, null, 2), 'utf8');
  console.log(`Generated: ${filePath}`);
}

const buildingsModel = {
  meta: {
    format_version: '4.10',
    model_format: 'free',
    box_uv: true,
    creation_time: Math.floor(Date.now() / 1000),
    author: 'AstroCyberr Monopoly Generator',
    description: '4 Building Tiers (Wooden Fence -> Oak Cottage -> 2-Story Villa -> Crown Castle) + The End Portal'
  },
  name: 'buildings_voxel',
  model_identifier: 'buildings_voxel',
  visible_box: [2, 2, 0],
  resolution: { width: 64, height: 64 },
  elements: [
    {
      name: 'tier1_wooden_fence_post',
      from: [-6, 0, -6],
      to: [-4, 6, -4],
      origin: [-5, 0, -5],
      uuid: 'bldg-tier1-fence',
      type: 'cube'
    },
    {
      name: 'tier2_oak_cottage_base',
      from: [-5, 0, -5],
      to: [5, 7, 5],
      origin: [0, 0, 0],
      uuid: 'bldg-tier2-cottage',
      type: 'cube'
    },
    {
      name: 'tier3_two_story_villa',
      from: [-6, 0, -6],
      to: [6, 13, 6],
      origin: [0, 0, 0],
      uuid: 'bldg-tier3-villa',
      type: 'cube'
    },
    {
      name: 'tier4_crown_castle_keep',
      from: [-7, 0, -7],
      to: [7, 18, 7],
      origin: [0, 0, 0],
      uuid: 'bldg-tier4-castle',
      type: 'cube'
    }
  ],
  outliner: ['bldg-tier1-fence', 'bldg-tier2-cottage', 'bldg-tier3-villa', 'bldg-tier4-castle'],
  textures: []
};

const buildingsPath = path.join(outDir, 'buildings_voxel.bbmodel');
fs.writeFileSync(buildingsPath, JSON.stringify(buildingsModel, null, 2), 'utf8');
console.log(`Generated: ${buildingsPath}`);
