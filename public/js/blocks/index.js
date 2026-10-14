// public/js/blocks/index.js
import { BLOCK_TYPES } from '../constants.js';
import { blockRegistry } from '../core/blockRegistry.js';

import { OnlyTitleBlock } from './onlyTitleBlock.js';
import { OnlyNumberBlock } from './onlyNumberBlock.js';
import { TitleNumberBlock } from './titleNumberBlock.js';
import { TitleGroupNumberBlock } from './titleGroupNumberBlock.js';
import { ToggleButtonBlock } from './toggleButtonBlock.js';
import { PageButtonBlock } from './pageButtonBlock.js';
import { ImageBlock } from './imageBlock.js';
import { SendButtonBlock } from './sendButtonBlock.js';
import { TitleInputBlock } from './titleInputBlock.js';
import { EmptyBoxBlock } from './emptyBoxBlock.js';
import { NodeCardBlock } from './nodeCardBlock.js';

blockRegistry.register(BLOCK_TYPES.ONLY_TITLE, OnlyTitleBlock);
blockRegistry.register(BLOCK_TYPES.ONLY_NUMBER, OnlyNumberBlock);
blockRegistry.register(BLOCK_TYPES.TITLE_NUMBER, TitleNumberBlock);
blockRegistry.register(BLOCK_TYPES.TITLE_GROUP_NUMBER, TitleGroupNumberBlock);
blockRegistry.register(BLOCK_TYPES.TOGGLE_BUTTON, ToggleButtonBlock);
blockRegistry.register(BLOCK_TYPES.PAGE_BUTTON, PageButtonBlock);
blockRegistry.register(BLOCK_TYPES.IMAGE, ImageBlock);
blockRegistry.register(BLOCK_TYPES.SEND_BUTTON, SendButtonBlock);
blockRegistry.register(BLOCK_TYPES.TITLE_INPUT, TitleInputBlock);
blockRegistry.register(BLOCK_TYPES.EMPTY_BOX, EmptyBoxBlock);
blockRegistry.register(BLOCK_TYPES.NODE_CARD, NodeCardBlock);