// public/js/blocks/sendButtonBlock.js
import { BaseBlock } from './baseBlock.js';

export class SendButtonBlock extends BaseBlock {
    constructor(data, context) {
        super(data, context);
        this._originalText = null;
        this._dirtyListener = null;
    }

    render() {
        const root = this.makeRoot(['send-button']);
        const { regAddress, text = 'Сохранить' } = this.data;

        root.innerHTML = `
            <div class="value">
                <button class="send-button" data-reg="${regAddress}">
                    ${text}
                </button>
            </div>`;

        const button = root.querySelector('.send-button');
        this._originalText = button.textContent.trim();

        // Начальное состояние + подписка на изменения dirty
        this._updateButtonState(button);
        this._dirtyListener = () => {
            if (!document.body.contains(button)) return;
            this._updateButtonState(button);
        };
        window.addEventListener('input-dirty-change', this._dirtyListener);

        // Клик
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this._handleClick(button);
        });

        this.el = root;
        return root;
    }

    unmounted() {
        if (this._dirtyListener) {
            window.removeEventListener('input-dirty-change', this._dirtyListener);
            this._dirtyListener = null;
        }
    }

    // --- состояние кнопки ---
    _updateButtonState(button) {
        const regAttr = button.dataset.reg;
        if (!regAttr) return;

        const regs = regAttr.split(',').map(r => r.trim());
        const hasDirty = regs.some(reg => this.ctx.updater.isDirty(reg));
        button.disabled = !hasDirty;
    }

    // --- клик ---
    async _handleClick(button) {
        const regAttr = button.dataset.reg;
        if (!regAttr) {
            console.error('Нет data-reg у кнопки');
            return;
        }

        const regs = regAttr.split(',').map(r => r.trim());
        const hasDirty = regs.some(reg => this.ctx.updater.isDirty(reg));

        if (!hasDirty) {
            button.textContent = 'Нет изменений';
            setTimeout(() => { button.textContent = this._originalText; }, 1500);
            return;
        }

        button.textContent = '⏳ Отправка...';
        button.disabled = true;
        button.classList.add('sending');

        try {
            const registersToSend = [];
            const failedRegisters = [];

            for (const reg of regs) {
                const regKey = String(reg);
                let regInfo = this.ctx.updater.caches.inputs.get(regKey);

                if (!regInfo) {
                    console.warn(`⚠️ Регистр ${reg} не найден в кэше, ищем в DOM...`);
                    const inputElement = document.querySelector(`.input[data-reg="${reg}"]`);
                    if (inputElement) {
                        const regType = inputElement.dataset.type || 'u2';
                        this.ctx.updater.addInput(reg, inputElement, regType);
                        regInfo = this.ctx.updater.caches.inputs.get(regKey);
                    }
                }

                if (!regInfo) {
                    console.error(`❌ Регистр ${reg} не найден`);
                    failedRegisters.push(reg);
                    continue;
                }

                const value = regInfo.element?.value;
                if (!value || value.trim() === '') {
                    console.error(`❌ Пустое значение для регистра ${reg}`);
                    failedRegisters.push(reg);
                    continue;
                }

                registersToSend.push({
                    regAddress: reg,
                    value: value.trim(),
                    type: regInfo.registerType || 'u2',
                    element: regInfo.element,
                    regKey
                });
            }

            if (registersToSend.length === 0) {
                button.textContent = '❌ Нет данных';
                setTimeout(() => {
                    button.textContent = this._originalText;
                    button.disabled = false;
                    button.classList.remove('sending');
                }, 1500);
                return;
            }

            // Параллельная отправка
            const promises = registersToSend.map(({ regAddress, value, type }) =>
                this.ctx.api.writeRegister(regAddress, value, type)
            );

            const results = await Promise.allSettled(promises);

            let successCount = 0;
            let errorCount = 0;

            results.forEach((result, index) => {
                const regData = registersToSend[index];

                if (result.status === 'fulfilled') {
                    successCount++;
                    this.ctx.updater.updateOriginalValue(regData.regAddress, regData.value);
                    this._updateInputDirtyState(regData.element, regData.regAddress);

                    if (regData.element) {
                        regData.element.style.backgroundColor = '#e8f5e9';
                        regData.element.style.borderColor = 'green';
                        setTimeout(() => {
                            regData.element.style.backgroundColor = '';
                            regData.element.style.borderColor = '#ccc';
                        }, 1000);
                    }

                    this.ctx.updater.editingInputs.delete(regData.regKey);
                } else {
                    errorCount++;
                    console.error(`❌ Ошибка регистра ${regData.regAddress}:`, result.reason);

                    if (regData.element) {
                        regData.element.style.backgroundColor = '#ffebee';
                        regData.element.style.borderColor = 'red';
                        setTimeout(() => {
                            regData.element.style.backgroundColor = '';
                            regData.element.style.borderColor = '#ccc';
                        }, 2000);
                    }
                }
            });

            // Финальный статус кнопки
            if (errorCount === 0) {
                button.textContent = `✅ Отправлено (${successCount})`;
                button.classList.remove('sending');
                button.classList.add('success');
                setTimeout(() => {
                    button.textContent = this._originalText;
                    button.disabled = false;
                    button.classList.remove('success');
                }, 2000);
            } else if (successCount === 0) {
                button.textContent = `❌ Ошибка (${errorCount})`;
                button.classList.remove('sending');
                button.classList.add('error');
                setTimeout(() => {
                    button.textContent = this._originalText;
                    button.disabled = false;
                    button.classList.remove('error');
                }, 2500);
            } else {
                button.textContent = `⚠️ ${successCount}/${successCount + errorCount}`;
                button.classList.remove('sending');
                button.classList.add('partial');
                setTimeout(() => {
                    button.textContent = this._originalText;
                    button.disabled = false;
                    button.classList.remove('partial');
                }, 3000);
            }

        } catch (error) {
            console.error('❌ Критическая ошибка:', error);
            button.textContent = '❌ Ошибка сети';
            button.classList.remove('sending');
            button.classList.add('error');

            for (const reg of regs) {
                this.ctx.updater.editingInputs.delete(String(reg));
            }

            setTimeout(() => {
                button.textContent = this._originalText;
                button.disabled = false;
                button.classList.remove('error');
            }, 2500);
        }
    }

    // --- вспомогательное: обновить dirty-класс у input ---
    _updateInputDirtyState(input, regAddress) {
        if (!input) return;
        const regKey = String(regAddress);
        const isDirty = this.ctx.updater.isDirty(regKey);
        input.classList.toggle('input-changed', isDirty);
        window.dispatchEvent(new CustomEvent('input-dirty-change'));
    }
}