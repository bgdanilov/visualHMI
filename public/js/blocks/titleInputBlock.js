// public/js/blocks/titleInputBlock.js
import { BaseBlock } from './baseBlock.js';
import { parseInputConfig } from '../utils/parseInputConfig.js';
import { inputMarkup } from './titleInput/inputMarkup.js';
import { InputController } from './titleInput/InputController.js';

export class TitleInputBlock extends BaseBlock {
    constructor(data, context) {
        super(data, context);
        this._controller = null;
    }

    render() {
        const cfg  = parseInputConfig(this.data);
        const root = this.makeRoot(['title-input']);

        root.innerHTML = inputMarkup(cfg);

        const input    = root.querySelector('.input');
        const resetBtn = root.querySelector('.input-reset');
        const saveBtn  = root.querySelector('.input-save');

        // Регистрация в updater — до attach(), чтобы caches.inputs был готов
        this.ctx.updater.addInput(cfg.regAddress, input, cfg.regType);

        this._controller = new InputController({
            input,
            resetBtn,
            saveBtn,
            cfg,
            ctx: this.ctx
        });
        this._controller.attach();

        this.el = root;
        return root;
    }

    unmounted() {
        if (this._controller) {
            this._controller.detach();
            this._controller = null;
        }
    }
}