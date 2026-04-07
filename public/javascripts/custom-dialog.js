/* public/javascripts/custom-dialog.js */
const CekUangkuDialog = {
    _createOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'custom-dialog-overlay';
        overlay.id = 'custom-dialog-overlay';
        return overlay;
    },

    _removeOverlay() {
        const overlay = document.getElementById('custom-dialog-overlay');
        if (overlay) {
            overlay.classList.add('fade-out'); // Optional fade out
            setTimeout(() => overlay.remove(), 200);
        }
    },

    _getIcon(type) {
        switch(type) {
            case 'success': return '<i class="fas fa-check-circle"></i>';
            case 'error': return '<i class="fas fa-times-circle"></i>';
            case 'warning': return '<i class="fas fa-exclamation-triangle"></i>';
            case 'confirm': return '<i class="fas fa-question-circle"></i>';
            case 'delete': return '<i class="fas fa-trash-alt"></i>';
            default: return '<i class="fas fa-info-circle"></i>';
        }
    },

    alert(message, title = 'Informasi', type = 'info') {
        return new Promise((resolve) => {
            const overlay = this._createOverlay();
            const iconClass = type === 'error' ? 'confirm' : (type === 'success' ? 'success' : 'warning');
            
            overlay.innerHTML = `
                <div class="custom-dialog-box">
                    <div class="custom-dialog-icon ${iconClass}">
                        ${this._getIcon(type)}
                    </div>
                    <div class="custom-dialog-title">${title}</div>
                    <div class="custom-dialog-message">${message}</div>
                    <div class="custom-dialog-actions">
                        <button class="custom-dialog-btn btn-ok" id="dialog-ok">Oke</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);

            document.getElementById('dialog-ok').addEventListener('click', () => {
                this._removeOverlay();
                resolve(true);
            });
        });
    },

    confirm(message, title = 'Konfirmasi', type = 'confirm') {
        return new Promise((resolve) => {
            const overlay = this._createOverlay();
            const iconClass = (type === 'delete' || type === 'confirm') ? 'confirm' : 'warning';
            const iconHtml = type === 'delete' ? this._getIcon('delete') : this._getIcon('confirm');

            overlay.innerHTML = `
                <div class="custom-dialog-box">
                    <div class="custom-dialog-icon ${iconClass}">
                        ${iconHtml}
                    </div>
                    <div class="custom-dialog-title">${title}</div>
                    <div class="custom-dialog-message">${message}</div>
                    <div class="custom-dialog-actions">
                        <button class="custom-dialog-btn btn-cancel" id="dialog-cancel">Batal</button>
                        <button class="custom-dialog-btn btn-confirm" id="dialog-confirm">Ya, Lanjutkan</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);

            document.getElementById('dialog-cancel').addEventListener('click', () => {
                this._removeOverlay();
                resolve(false);
            });

            document.getElementById('dialog-confirm').addEventListener('click', () => {
                this._removeOverlay();
                resolve(true);
            });

            // Close on overlay click
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this._removeOverlay();
                    resolve(false);
                }
            });
        });
    },

    // Helper for forms
    async confirmDelete(message, form) {
        const confirmed = await this.confirm(message, 'Hapus Data', 'delete');
        if (confirmed) {
            form.submit();
        }
    }
};

// Global intercept for easier migration
window.customConfirm = (msg) => CekUangkuDialog.confirm(msg);
window.customAlert = (msg, type = 'info') => CekUangkuDialog.alert(msg, 'Informasi', type);
