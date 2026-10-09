// public/js/blocks/index.js
import { BLOCK_TYPES } from '../constants.js';
import { blockRegistry } from '../core/blockRegistry.js';

import { OnlyTitleBlock } from './onlyTitleBlock.js';
import { OnlyNumberBlock } from './onlyNumberBlock.js';

blockRegistry.register(BLOCK_TYPES.ONLY_TITLE, OnlyTitleBlock);
blockRegistry.register(BLOCK_TYPES.ONLY_NUMBER, OnlyNumberBlock);