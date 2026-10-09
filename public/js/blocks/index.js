// public/js/blocks/index.js
import { BLOCK_TYPES } from '../constants.js';
import { blockRegistry } from '../core/blockRegistry.js';

import { OnlyTitleBlock } from './onlyTitleBlock.js';
import { OnlyNumberBlock } from './onlyNumberBlock.js';
import { ToggleButtonBlock } from './toggleButtonBlock.js';

blockRegistry.register(BLOCK_TYPES.ONLY_TITLE, OnlyTitleBlock);
blockRegistry.register(BLOCK_TYPES.ONLY_NUMBER, OnlyNumberBlock);
blockRegistry.register(BLOCK_TYPES.TOGGLE_BUTTON, ToggleButtonBlock);