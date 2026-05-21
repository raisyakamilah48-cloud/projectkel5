/* public/javascripts/custom-dialog.js — Premium Redesign */
const CekUangkuDialog = {

    _createOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'custom-dialog-overlay';
        overlay.id = 'custom-dialog-overlay-' + Date.now();
        return overlay;
    },

    _removeOverlay(overlay) {
        if (!overlay) return;
        overlay.style.animation = 'dlg-overlay-in 0.18s ease reverse forwards';
        const box = overlay.querySelector('.custom-dialog-box');
        if (box) box.style.animation = 'dlg-box-out 0.18s ease forwards';
        setTimeout(() => overlay.remove(), 200);
    },

    _getIcon(type) {
        const icons = {
            success: '<i class="fas fa-check"></i>',
            error:   '<i class="fas fa-times"></i>',
            warning: '<i class="fas fa-exclamation"></i>',
            confirm: '<i class="fas fa-question"></i>',
            delete:  '<i class="fas fa-trash-alt"></i>',
            logout:  '<i class="fas fa-sign-out-alt"></i>',
            info:    '<i class="fas fa-info"></i>',
        };
        return icons[type] || icons.info;
    },

    _typeToIconClass(type) {
        const map = {
            success: 'success',
            error:   'error',
            warning: 'warning',
            confirm: 'confirm',
            delete:  'delete',
            logout:  'delete',
            info:    'info',
        };
        return map[type] || 'info';
    },

    /**
     * alert(message, title, type)
     * type: 'info' | 'success' | 'warning' | 'error'
     */
    alert(message, title = 'Informasi', type = 'info') {
        return new Promise((resolve) => {
            const overlay = this._createOverlay();
            const iconClass = this._typeToIconClass(type);
            const boxType   = type === 'error' ? 'error' : (type === 'success' ? 'success' : (type === 'warning' ? 'warning' : 'info'));
            const btnClass  = type === 'warning' ? 'btn-ok-warning' : 'btn-ok';

            overlay.innerHTML = `
                <div class="custom-dialog-box type-${boxType}">
                    <div class="custom-dialog-icon ${iconClass}">
                        ${this._getIcon(type)}
                    </div>
                    <div class="custom-dialog-title">${title}</div>
                    <div class="custom-dialog-message">${message}</div>
                    <div class="custom-dialog-actions">
                        <button class="custom-dialog-btn ${btnClass}" id="dlg-ok">Oke</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);

            const okBtn = overlay.querySelector('#dlg-ok');
            okBtn.addEventListener('click', () => {
                this._removeOverlay(overlay);
                resolve(true);
            });

            // Close on overlay click
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this._removeOverlay(overlay);
                    resolve(true);
                }
            });

            // Close on Escape key
            const escHandler = (e) => {
                if (e.key === 'Escape') {
                    document.removeEventListener('keydown', escHandler);
                    this._removeOverlay(overlay);
                    resolve(true);
                }
            };
            document.addEventListener('keydown', escHandler);

            // Auto-focus OK button
            setTimeout(() => okBtn.focus(), 50);
        });
    },

    /**
     * confirm(message, title, type)
     * type: 'confirm' | 'delete' | 'warning'
     */
    confirm(message, title = 'Konfirmasi', type = 'confirm') {
        return new Promise((resolve) => {
            const overlay = this._createOverlay();
            const iconClass = this._typeToIconClass(type);
            const isDelete  = type === 'delete';
            const isLogout  = type === 'logout';
            const boxType   = (isDelete || isLogout) ? 'delete' : 'confirm';

            let actionBtnClass, actionBtnLabel;
            if (isDelete) {
                actionBtnClass = 'btn-confirm';
                actionBtnLabel = 'Ya, Hapus';
            } else if (isLogout) {
                actionBtnClass = 'btn-confirm';
                actionBtnLabel = 'Ya, Logout';
            } else {
                actionBtnClass = 'btn-continue';
                actionBtnLabel = 'Ya, Lanjutkan';
            }

            overlay.innerHTML = `
                <div class="custom-dialog-box type-${boxType}">
                    <div class="custom-dialog-icon ${iconClass}">
                        ${this._getIcon(type)}
                    </div>
                    <div class="custom-dialog-title">${title}</div>
                    <div class="custom-dialog-message">${message}</div>
                    <div class="custom-dialog-actions">
                        <button class="custom-dialog-btn btn-cancel" id="dlg-cancel">Batal</button>
                        <button class="custom-dialog-btn ${actionBtnClass}" id="dlg-confirm">${actionBtnLabel}</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);

            const cancelBtn  = overlay.querySelector('#dlg-cancel');
            const confirmBtn = overlay.querySelector('#dlg-confirm');

            cancelBtn.addEventListener('click', () => {
                this._removeOverlay(overlay);
                resolve(false);
            });

            confirmBtn.addEventListener('click', () => {
                this._removeOverlay(overlay);
                resolve(true);
            });

            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this._removeOverlay(overlay);
                    resolve(false);
                }
            });

            const escHandler = (e) => {
                if (e.key === 'Escape') {
                    document.removeEventListener('keydown', escHandler);
                    this._removeOverlay(overlay);
                    resolve(false);
                }
            };
            document.addEventListener('keydown', escHandler);

            // Focus cancel by default (safer UX)
            setTimeout(() => cancelBtn.focus(), 50);
        });
    },

    /** Helper untuk submit form setelah konfirmasi hapus */
    async confirmDelete(message, form) {
        const confirmed = await this.confirm(message, 'Hapus Data', 'delete');
        if (confirmed) form.submit();
    }
};

// Global shortcuts
window.customConfirm = (msg) => CekUangkuDialog.confirm(msg);
window.customAlert   = (msg, type = 'info') => CekUangkuDialog.alert(msg, 'Informasi', type);

// Logout confirmation — dipanggil dari sidebar
window.confirmLogout = async function(url) {
    const confirmed = await CekUangkuDialog.confirm(
        'Sesi Anda akan diakhiri dan Anda akan keluar dari akun. Apakah Anda yakin ingin logout?',
        'Keluar dari Akun',
        'logout'
    );
    if (confirmed) window.location.href = url;
};
