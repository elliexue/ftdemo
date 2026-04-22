
export type SeedId =
  | 'tulip'
  | 'rose'
  | 'sunflower'
  | 'hibiscus'
  | 'cherry_blossom'
  | 'daisy'
  | 'lotus'
  | 'hyacinth'
  | 'white_flower'
  | 'rosette';

export type WeatherId = 'sunny' | 'cloudy' | 'rain' | 'breeze';

export const WEATHER_ORDER: readonly WeatherId[] = ['sunny', 'cloudy', 'rain', 'breeze'];

export const WEATHER_CONFIG: Record<WeatherId, { label: string; icon: string; hint: string }> = {
  sunny: { label: '晴朗', icon: '☀', hint: '喜阳' },
  cloudy: { label: '多云', icon: '☁', hint: '耐阴' },
  rain: { label: '细雨', icon: '🌧', hint: '喜雨' },
  breeze: { label: '微风', icon: '🍃', hint: '迎风' },
};

/** 0 空地；1 埋种；2 幼苗；3 生长期；4 可收获 */
export type PlantStage = 0 | 1 | 2 | 3 | 4;

export interface PlotRuntime {
  seedId: SeedId | null;
  stage: PlantStage;
  growProgress: number;
  waterSaturation: number;
  /** 第二阶段是否需要浇水进入第三阶段 */
  needsWater: boolean;
  /** 第三阶段是否需要施肥进入第四阶段 */
  needsFertilizer: boolean;
  /** 浇水后等待施肥的冷却时长（秒） */
  fertilizerCooldown: number;
  /** 浇水特效剩余时长（秒） */
  waterFxTime: number;
  /** 施肥特效剩余时长（秒） */
  fertilizerFxTime: number;
  /** 施肥后是否触发超大花朵变异 */
  giantBloom: boolean;
  blessBonus: number;
  /** 好友田稀有品相（祝福等） */
  rareVariant?: boolean;
}

type SeedCfg = {
  label: string;
  seedPrice: number;
  sellBase: number;
  color: number;
  icon: string;
  preferredWeather: WeatherId;
  weatherGrowMul: number;
  weatherGrowMismatchMul: number;
};

export const SEED_CONFIG: Record<SeedId, SeedCfg> = {
  tulip: {
    label: '郁金香',
    seedPrice: 5,
    sellBase: 8,
    color: 0xe8c547,
    icon: '/assets/icons/tulip.svg',
    preferredWeather: 'sunny',
    weatherGrowMul: 1.32,
    weatherGrowMismatchMul: 0.9,
  },
  rose: {
    label: '玫瑰',
    seedPrice: 10,
    sellBase: 16,
    color: 0xd94a6b,
    icon: '/assets/icons/rose.svg',
    preferredWeather: 'breeze',
    weatherGrowMul: 1.3,
    weatherGrowMismatchMul: 0.88,
  },
  sunflower: {
    label: '向日葵',
    seedPrice: 12,
    sellBase: 18,
    color: 0xf0c33f,
    icon: '/assets/icons/sunflower.svg',
    preferredWeather: 'sunny',
    weatherGrowMul: 1.34,
    weatherGrowMismatchMul: 0.86,
  },
  hibiscus: {
    label: '木槿',
    seedPrice: 11,
    sellBase: 17,
    color: 0xdb4c74,
    icon: '/assets/icons/hibiscus.svg',
    preferredWeather: 'rain',
    weatherGrowMul: 1.28,
    weatherGrowMismatchMul: 0.9,
  },
  cherry_blossom: {
    label: '樱花',
    seedPrice: 9,
    sellBase: 15,
    color: 0xf2a7c3,
    icon: '/assets/icons/cherry_blossom.svg',
    preferredWeather: 'breeze',
    weatherGrowMul: 1.26,
    weatherGrowMismatchMul: 0.92,
  },
  daisy: {
    label: '雏菊',
    seedPrice: 8,
    sellBase: 14,
    color: 0xf6dd6d,
    icon: '/assets/icons/daisy.svg',
    preferredWeather: 'cloudy',
    weatherGrowMul: 1.25,
    weatherGrowMismatchMul: 0.93,
  },
  lotus: {
    label: '莲花',
    seedPrice: 14,
    sellBase: 21,
    color: 0xd17adf,
    icon: '/assets/icons/lotus.svg',
    preferredWeather: 'rain',
    weatherGrowMul: 1.33,
    weatherGrowMismatchMul: 0.87,
  },
  hyacinth: {
    label: '风信子',
    seedPrice: 13,
    sellBase: 20,
    color: 0x8f66df,
    icon: '/assets/icons/hyacinth.svg',
    preferredWeather: 'cloudy',
    weatherGrowMul: 1.27,
    weatherGrowMismatchMul: 0.91,
  },
  white_flower: {
    label: '栀子花',
    seedPrice: 7,
    sellBase: 12,
    color: 0xf6f3e8,
    icon: '/assets/icons/white_flower.svg',
    preferredWeather: 'cloudy',
    weatherGrowMul: 1.22,
    weatherGrowMismatchMul: 0.94,
  },
  rosette: {
    label: '薰衣草',
    seedPrice: 15,
    sellBase: 23,
    color: 0x9c78df,
    icon: '/assets/icons/rosette.svg',
    preferredWeather: 'sunny',
    weatherGrowMul: 1.29,
    weatherGrowMismatchMul: 0.89,
  },
};

export const SEED_IDS = Object.keys(SEED_CONFIG) as SeedId[];
