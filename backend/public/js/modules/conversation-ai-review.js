/**
 * Kaya CRM — employee review UI; never calls an outbound endpoint
 * @file backend/public/js/modules/conversation-ai-review.js
 * @layer frontend/dashboard
 * @owner Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see docs/CODEBASE-MAP.md
 */
(function (root) {
    'use strict';
    let version = 0;
    let current = null;
    const COPY = {
        fa: root.__I18N_FA && root.__I18N_FA.ai_review_copy,
        en: root.__I18N_EN && root.__I18N_EN.ai_review_copy,
        tr: root.__I18N_TR && root.__I18N_TR.ai_review_copy,
    };

    function reset() {
        version++;
        current = null;
        const panel = root.document.getElementById('conversationAiReview');
        if (panel) {
            panel.hidden = true;
            panel.replaceChildren();
        }
    }

    async function open(options) {
        reset();
        const panel = root.document.getElementById('conversationAiReview');
        if (!panel || !options || options.isGroup) return;
        const mine = version;
        const lang = COPY[options.language] ? options.language : 'fa';
        const labels = COPY[lang];
        if (!labels) return;
        let status;
        try {
            status = await options.request('/api/conversations/ai-assist/status');
        } catch (_) {
            return;
        }
        if (mine !== version || !status.ok || !status.data || !status.data.enabled) return;
        current = options;
        panel.hidden = false;
        const heading = root.document.createElement('strong');
        heading.textContent = labels[0];
        const actions = root.document.createElement('div');
        actions.className = 'ai-review-actions';
        const notice = root.document.createElement('p');
        notice.className = 'ai-review-notice';
        notice.textContent = status.data.configured ? labels[4] : labels[8];
        notice.setAttribute('role', 'status');
        const result = root.document.createElement('div');
        result.hidden = true;
        panel.append(heading, actions, notice, result);

        function button(text, handler, parent) {
            const el = root.document.createElement('button');
            el.type = 'button';
            el.className = 'btn-secondary btn-sm';
            el.textContent = text;
            el.addEventListener('click', handler);
            (parent || actions).appendChild(el);
            return el;
        }

        async function generate(kind) {
            if (mine !== version || current !== options) return;
            reply.disabled = summary.disabled = true;
            result.replaceChildren();
            result.hidden = true;
            notice.textContent = labels[3];
            try {
                const res = await options.request(
                    '/api/conversations/' + encodeURIComponent(options.id) + '/ai-assist',
                    {
                        method: 'POST',
                        body: JSON.stringify({ kind: kind, language: lang }),
                    }
                );
                if (mine !== version || current !== options) return;
                if (
                    !res.ok ||
                    !res.data ||
                    typeof res.data.text !== 'string' ||
                    res.data.conversationId !== options.id
                ) {
                    const code = res.data && res.data.error;
                    notice.textContent =
                        code === 'AI_NOT_CONFIGURED'
                            ? labels[8]
                            : code === 'AI_RATE_LIMIT'
                              ? labels[10]
                              : labels[9];
                    return;
                }
                const title = root.document.createElement('label');
                title.textContent = kind === 'reply' ? labels[13] : labels[2];
                title.htmlFor = 'aiReviewText';
                const text = root.document.createElement('textarea');
                text.id = 'aiReviewText';
                text.dir = 'auto';
                text.value = res.data.text;
                text.maxLength = 4000;
                const hint = root.document.createElement('p');
                hint.textContent = kind === 'reply' ? labels[12] : labels[11] + ' ' + labels[12];
                result.append(title, text, hint);
                const footer = root.document.createElement('div');
                footer.className = 'ai-review-actions';
                result.appendChild(footer);
                if (kind === 'reply') {
                    button(
                        labels[5],
                        function () {
                            if (mine !== version || !text.value.trim()) return;
                            if (options.insertDraft(text.value.trim(), labels[14]) === false)
                                return;
                            result.hidden = true;
                            result.replaceChildren();
                            notice.textContent = labels[7];
                        },
                        footer
                    );
                }
                button(
                    labels[6],
                    function () {
                        result.hidden = true;
                        result.replaceChildren();
                        notice.textContent = labels[4];
                    },
                    footer
                );
                result.hidden = false;
                notice.textContent = labels[4];
            } catch (_) {
                if (mine === version) notice.textContent = labels[9];
            } finally {
                if (mine === version) reply.disabled = summary.disabled = !status.data.configured;
            }
        }

        const reply = button(labels[1], function () {
            generate('reply');
        });
        const summary = button(labels[2], function () {
            generate('summary');
        });
        reply.disabled = summary.disabled = !status.data.configured;
    }

    root.CRMConversationAI = { open: open, reset: reset };
})(window);
