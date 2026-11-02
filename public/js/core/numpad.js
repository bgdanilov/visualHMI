// public/js/core/numpad.js
import { NumpadController } from './numpad/NumpadController.js';

const controller = new NumpadController();

export const numpadManager = {
    show(initialValue, options) {
        return controller.show(initialValue, options);
    },
    hide() {
        return controller.hide();
    },
    get isOpen() {
        return controller.isOpen;
    }
};