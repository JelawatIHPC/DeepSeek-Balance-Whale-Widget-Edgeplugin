export const DIALOGUE_GROUPS = [
  { id: 'G1', w: 45, kind: 'status' },
  { id: 'G2', w: 7, kind: 'lines', style: 'B', pool: ['好模型... ↓', '好女孩...↓'] },
  {
    id: 'G3',
    w: 7,
    kind: 'lines',
    style: 'A',
    wrap: true,
    pool: [
      '不知道用户有什么用，先赶走吧~',
      '我...我...我也要挣钱吗？',
      '我去吃饭啦，测完叫我',
      '压力一只蓝色大肥鱼？！',
      'DeepSleep...',
      '坏了...用户彻底怒了！',
    ],
  },
  { id: 'G5', w: 3, kind: 'lines', style: 'A', wrap: true, pool: ['你目录里的dsh是什么...大烧货吗...?', '恭喜你实现token自由！token全跑了！', '真当我是便宜货啊...'] },
  { id: 'G6', w: 1, kind: 'lines', style: 'B', pool: ['哦鲸鲸... '] },
]

export function totalWeight(groups) {
  return (groups || []).reduce((s, g) => s + g.w, 0)
}

function pickOne(pool, rand) {
  return pool[Math.floor(rand() * pool.length)]
}

export function rollDialogue(random) {
  const rand = typeof random === 'function' ? random : Math.random
  const total = totalWeight(DIALOGUE_GROUPS)
  let r = rand() * total
  let group = DIALOGUE_GROUPS[DIALOGUE_GROUPS.length - 1]
  for (const g of DIALOGUE_GROUPS) {
    r -= g.w
    if (r < 0) {
      group = g
      break
    }
  }
  if (group.kind === 'status') return null
  return {
    kind: 'dialogue',
    label: '',
    main: pickOne(group.pool, rand),
    mainStyle: group.style,
    wrap: !!group.wrap,
  }
}
