            loadTasks();
        }
        function taskStatusLabel(s) { return { pending: t('status_pending'), in_progress: t('status_in_progress'), done: t('status_done'), cancelled: t('status_cancelled') }[s] || s; }
        function taskPriorityLabel(s) { return { low: t('priority_low'), normal: t('priority_normal'), high: t('priority_high'), urgent: t('priority_urgent') }[s] || s; }
        function toggleTaskForm() {
            const box = document.getElementById('taskFormBox');
            const btn = document.getElementById('btnTaskCreate');
            if (box && btn) {
                const show = box.style.display !== 'block';
                box.style.display = show ? 'block' : 'none';
                btn.textContent = show ? (t('cancel') || (LANG === 'fa' ? 'انصراف' : 'Cancel')) : (t('new_task') || (LANG === 'fa' ? 'تسک جدید' : 'New task'));
                if (show) { toggleTaskAssignTarget(); }
            }
        }
        function toggleTaskAssignTarget() {
            const typeSel = document.getElementById('taskAssignType');
            const userSel = document.getElementById('taskAssignUser');
            const deptSel = document.getElementById('taskAssignDept');
            const isUser = typeSel && typeSel.value === 'user';
            if (userSel) userSel.style.display = isUser ? '' : 'none';
            if (deptSel) deptSel.style.display = isUser ? 'none' : '';
        }
        function loadTasksFilters() {
            const userSel = document.getElementById('taskAssignUser');
            const deptSel = document.getElementById('taskAssignDept');
            const branchSel = document.getElementById('taskBranch');
            Promise.all([apiFetch('/api/users'), apiFetch('/api/departments'), apiFetch('/api/branches')]).then(function(ress) {
                const users = (ress[0].data && ress[0].data.data) || [];
                const depts = (ress[1].data && ress[1].data.data) || [];
                const branches = (ress[2].data && ress[2].data.data) || [];
                const activeUsers = users.filter(function(u){ return u.isActive !== false; });
                if (userSel) userSel.innerHTML = '<option value="">' + t('select_user_task') + '</option>' + activeUsers.map(function(u){ return '<option value="' + u.id + '">' + escapeHtml(u.username || u.name || u.email) + '</option>'; }).join('');
                if (deptSel) deptSel.innerHTML = '<option value="">' + t('select_dept') + '</option>' + depts.map(function(d){ return '<option value="' + d.id + '">' + escapeHtml(d.name) + '</option>'; }).join('');
                if (branchSel) branchSel.innerHTML = '<option value="">' + t('no_branch') + '</option>' + branches.map(function(b){ return '<option value="' + b.id + '">' + escapeHtml(b.name || '') + '</option>'; }).join('');
                const filterDept = document.getElementById('taskFilterDept');
                const filterUser = document.getElementById('taskFilterUser');
                const myDeptOpt = (currentUser && currentUser.departmentId) ? '<option value="__my_dept__">' + (LANG === 'fa' ? 'دپارتمان من' : 'My department') + '</option>' : '';
                if (filterDept) filterDept.innerHTML = '<option value="">' + t('all_depts') + '</option>' + myDeptOpt + depts.map(function(d){ return '<option value="' + d.id + '">' + escapeHtml(d.name) + '</option>'; }).join('');
                if (filterUser) filterUser.innerHTML = '<option value="">' + t('filter_all_users') + '</option>' + activeUsers.map(function(u){ return '<option value="' + u.id + '">' + escapeHtml(u.username || u.name || u.email) + '</option>'; }).join('');
                const filterBranch = document.getElementById('taskFilterBranch');
                if (filterBranch) filterBranch.innerHTML = '<option value="">' + t('all_branches') + '</option>' + branches.map(function(b){ return '<option value="' + b.id + '">' + escapeHtml(b.name || '') + '</option>'; }).join('');
            });
        }
        function initTaskSearchDebounce() {
            const inp = document.getElementById('taskSearch');
            if (inp && !inp._taskSearchBound) {
                inp._taskSearchBound = true;
                inp.addEventListener('input', function() {
                    clearTimeout(window._taskSearchT);
                    window._taskSearchT = setTimeout(function() { loadTasks(); }, 400);
                });
            }
        }
        let taskListPage = 1;
        let taskListTotal = 0;
        function renderTaskItem(task) {
            const assign = task.assignedToDepartmentId && task.department ? (LANG === 'fa' ? 'دپارتمان ' : 'Dept ') + escapeHtml(task.department.name) + (LANG === 'fa' ? ' (همه اعضا)' : ' (all)') : userDisplayHtml(task.assignee) || '\u2014';
            const due = task.dueDate ? fmtTZ(task.dueDate, 'date') : '';
            const isOverdue = task.dueDate && (task.status === 'pending' || task.status === 'in_progress') && new Date(task.dueDate) < new Date();
            const overdueBadge = isOverdue ? '<span class="badge overdue" title="' + (t('overdue') || 'مهلت گذشته') + '">' + (t('overdue') || 'مهلت گذشته') + '</span>' : '';
            const prioBadge = task.priority && task.priority !== 'normal' ? '<span class="badge ' + task.priority + '">' + escapeHtml(taskPriorityLabel(task.priority)) + '</span>' : '';
            const dueLabel = t('due_label') || (LANG === 'fa' ? 'مهلت: ' : 'Due: ');
            const safeId = escapeHtml(task.id || '');
            const deleteBtn = canDeleteThisTask(task)
                ? '<button type="button" class="btn-danger btn-sm task-card-delete" data-task-id="' + safeId + '">' + (t('btn_delete') || (LANG === 'fa' ? 'حذف' : 'Delete')) + '</button>'
                : '';
            return '<div class="task-list-item' + (isOverdue ? ' task-overdue' : '') + '" data-task-id="' + safeId + '" role="button" tabindex="0"><div class="task-item-body"><span class="name">' + escapeHtml(task.title) + '</span><div class="meta">' + assign + ' \u00B7 ' + taskStatusLabel(task.status) + (due ? ' \u00B7 ' + dueLabel + ' ' + due : '') + '</div></div><div class="task-item-badges">' + overdueBadge + prioBadge + '<span class="badge ' + (task.status || '') + '">' + taskStatusLabel(task.status) + '</span>' + deleteBtn + '</div></div>';
        }
        function canDeleteTasks() {
            if (!currentUser) return false;
            var role = currentUser.role || '';
            return role === 'owner' || role === 'admin' || role === 'manager';
        }
        function canDeleteThisTask(task) {
            if (canDeleteTasks()) return true;
            if (task && currentUser && task.createdBy && String(task.createdBy) === String(currentUser.id)) return true;
            return false;
        }
        function deleteTaskConfirm(id) {
            var tid = id || currentTaskId;
            if (!tid) return;
            if (!confirm(t('task_delete_confirm') || (LANG === 'fa' ? 'آیا از حذف این تسک مطمئن هستید؟ این عمل قابل بازگشت نیست.' : 'Delete this task? This cannot be undone.'))) return;
            deleteTask(tid);
        }
        async function deleteTask(id) {
            const res = await apiFetch('/api/tasks/' + id, { method: 'DELETE' });
            if (res.needLogin) return;
            if (res.ok) {
                toast(t('toast_task_deleted') || (LANG === 'fa' ? 'تسک حذف شد' : 'Task deleted'));
                showTaskList();
                loadTasks();
                loadTasksSummary();
            } else {
                toast((res.data && res.data.error) || t('err_generic'), true);
            }
        }
        async function loadTasks(append) {
            const list = document.getElementById('taskList');
            if (!list) return;
            if (!append) { taskListPage = 1; setLoading('taskList', 4); }
            const statusSel = document.getElementById('taskFilterStatus');
            const status = (statusSel && statusSel.value) || '';
            if (!append && statusSel) { taskQuickTab = status || 'all'; const tabs = document.querySelectorAll('.task-quick-tabs .task-tab'); if (tabs) tabs.forEach(function(btn) { btn.classList.toggle('active', (btn.getAttribute('data-tab') || '') === taskQuickTab); }); }
            const deptEl = document.getElementById('taskFilterDept');
            let dept = deptEl ? deptEl.value : '';
            if (dept === '__my_dept__' && currentUser && currentUser.departmentId) dept = currentUser.departmentId;
            const user = (document.getElementById('taskFilterUser') && document.getElementById('taskFilterUser').value) || '';
            const branch = (document.getElementById('taskFilterBranch') && document.getElementById('taskFilterBranch').value) || '';
            const search = (document.getElementById('taskSearch') && document.getElementById('taskSearch').value || '').trim();
            let q = '?limit=50&page=' + (append ? taskListPage : 1);
            if (status) q += '&status=' + encodeURIComponent(status);
            if (dept && dept !== '__my_dept__') q += '&assignedToDepartmentId=' + encodeURIComponent(dept);
            if (user) q += '&assignedTo=' + encodeURIComponent(user);
            if (branch) q += '&branchId=' + encodeURIComponent(branch);
            if (search) q += '&search=' + encodeURIComponent(search);
            const res = await apiFetch('/api/tasks' + q);
            if (res.needLogin) return;
            if (!res.ok) { list.innerHTML = '<div class="empty">' + t('err_generic') + ': ' + escapeHtml(res.data && res.data.error ? res.data.error : '') + '</div>'; return; }
            const data = res.data;
            taskListTotal = data.total || 0;
            const countEl = document.getElementById('taskListCount');
            const loadMoreEl = document.getElementById('taskListLoadMore');
            if (!data.data || data.data.length === 0) {
                if (!append) {
                    list.innerHTML = '<div class="empty task-list-empty"><span class="empty-icon">📋</span><p>' + t('empty_tasks') + '</p><button type="button" class="btn-primary" id="emptyTaskFormBtn" style="margin-top:12px;">' + t('new_task') + '</button></div>';
                    setTimeout(function() {
                        const emptyBtn = document.getElementById('emptyTaskFormBtn');
                        if (emptyBtn) {
                            emptyBtn.removeEventListener('click', toggleTaskForm);
                            emptyBtn.addEventListener('click', toggleTaskForm);
                        }
                    }, 50);
                }
                if (countEl) countEl.style.display = 'none';
                if (loadMoreEl) loadMoreEl.style.display = 'none';
                return;
            }
            const html = data.data.map(renderTaskItem).join('');
            if (append) list.innerHTML += html; else list.innerHTML = html;
            list.classList.remove('empty');
            const loadedCount = append ? (taskListPage * 50) : data.data.length;
            if (countEl) { countEl.textContent = loadedCount + (LANG === 'fa' ? ' از ' : ' of ') + taskListTotal + (LANG === 'fa' ? ' تسک' : ' tasks'); countEl.style.display = ''; }
            if (loadMoreEl) { loadMoreEl.style.display = (taskListTotal > loadedCount) ? 'block' : 'none'; }
            taskListPage = append ? taskListPage + 1 : 2;
        }
        function loadMoreTasks() {
            const btn = document.getElementById('btnLoadMoreTasks') || document.querySelector('#taskListLoadMore button');
            if (btn) { btn.disabled = true; btn.textContent = (LANG === 'fa' ? 'در حال بارگذاری...' : 'Loading...'); }
            loadTasks(true).finally(function() {
                if (btn) { btn.disabled = false; btn.textContent = t('load_more'); }
            });
        }
        async function loadTasksSummary() {
            const box = document.getElementById('tasksSummaryBox');
            if (!box) return;
            const role = (currentUser && currentUser.role) || '';
            if (role !== 'owner' && role !== 'admin' && role !== 'manager' && role !== 'supervisor') { box.style.display = 'none'; return; }
            const res = await apiFetch('/api/tasks/summary');
            if (res.needLogin || !res.ok) { box.style.display = 'none'; return; }
            const d = res.data;
            let html = '';
            if (d.byDepartment && d.byDepartment.length) {
                html += '<div class="stat-card" style="min-width:220px;"><div class="label" style="margin-bottom:12px;">' + t('by_dept') + '</div>';
                d.byDepartment.forEach(function(x) {
                    const sep = LANG === 'fa' ? '، ' : ', ';
                    html += '<div class="task-summary-row" style="margin-top:8px; font-size:0.9rem; padding:6px 0; border-bottom:1px solid var(--border);">' + escapeHtml(x.department && x.department.name ? x.department.name : '') + ': ' + t('status_pending') + ' ' + (x.pending||0) + sep + t('status_in_progress') + ' ' + (x.in_progress||0) + sep + t('status_done') + ' ' + (x.done||0) + '</div>';
                });
                html += '</div>';
            }
            if (d.byUser && d.byUser.length) {
                html += '<div class="stat-card" style="min-width:220px;"><div class="label" style="margin-bottom:12px;">' + t('by_user') + '</div>';
                d.byUser.forEach(function(x) {
                    const sep = LANG === 'fa' ? '، ' : ', ';
                    html += '<div class="task-summary-row" style="margin-top:8px; font-size:0.9rem; padding:6px 0; border-bottom:1px solid var(--border);">' + escapeHtml(userDisplay(x.user)) + ': ' + t('status_pending') + ' ' + (x.pending||0) + sep + t('status_in_progress') + ' ' + (x.in_progress||0) + sep + t('status_done') + ' ' + (x.done||0) + '</div>';
                });
                html += '</div>';
            }
            box.innerHTML = html || '';
            box.style.display = (html ? 'flex' : 'none');
        }
        async function addTask() {
            const title = (document.getElementById('taskTitle') && document.getElementById('taskTitle').value) || '';
            if (!title.trim()) { toast(t('task_title_required'), true); return; }
            const type = (document.getElementById('taskAssignType') && document.getElementById('taskAssignType').value) || 'user';
            const userId = type === 'user' ? (document.getElementById('taskAssignUser') && document.getElementById('taskAssignUser').value) : null;
            const deptId = type === 'department' ? (document.getElementById('taskAssignDept') && document.getElementById('taskAssignDept').value) : null;
            if (!userId && !deptId) { toast(t('select_assignee'), true); return; }
            const body = { title: title.trim(), description: (document.getElementById('taskDesc') && document.getElementById('taskDesc').value) || '', assignedTo: userId || undefined, assignedToDepartmentId: deptId || undefined, priority: (document.getElementById('taskPriority') && document.getElementById('taskPriority').value) || 'normal' };
            const due = document.getElementById('taskDueDate') && document.getElementById('taskDueDate').value;
            if (due) body.dueDate = new Date(due).toISOString();
            const branchId = document.getElementById('taskBranch') && document.getElementById('taskBranch').value;
            if (branchId) body.branchId = branchId;
            const res = await apiFetch('/api/tasks', { method: 'POST', body: JSON.stringify(body) });
            if (res.needLogin) return;
            if (res.ok) {
                if (document.getElementById('taskTitle')) document.getElementById('taskTitle').value = '';
                if (document.getElementById('taskDesc')) document.getElementById('taskDesc').value = '';
                if (document.getElementById('taskBranch')) document.getElementById('taskBranch').value = '';
                if (document.getElementById('taskDueDate')) document.getElementById('taskDueDate').value = '';
                if (document.getElementById('taskAssignUser')) document.getElementById('taskAssignUser').value = '';
                if (document.getElementById('taskAssignDept')) document.getElementById('taskAssignDept').value = '';
                toggleTaskForm();
                toast(t('toast_task_created'));
                loadTasks();
                loadTasksSummary();
            } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }
        function showTaskList() {
            document.getElementById('taskDetailBox').style.display = 'none';
            document.getElementById('taskList').style.display = 'block';
            currentTaskId = null;
            const delBtn = document.getElementById('taskDeleteBtn');
            if (delBtn) delBtn.style.display = 'none';
            loadTasks();
        }
        function toggleTaskDetailAssign() {
            const typeSel = document.getElementById('taskDetailAssignType');
            const userSel = document.getElementById('taskDetailAssignUser');
            const deptSel = document.getElementById('taskDetailAssignDept');
            const isUser = typeSel && typeSel.value === 'user';
            if (userSel) userSel.style.display = isUser ? '' : 'none';
            if (deptSel) deptSel.style.display = isUser ? 'none' : '';
        }
        async function updateTaskFromDetail() {
            if (!currentTaskId) return;
            const typeSel = document.getElementById('taskDetailAssignType');
            const userSel = document.getElementById('taskDetailAssignUser');
            const deptSel = document.getElementById('taskDetailAssignDept');
            const type = typeSel ? typeSel.value : 'user';
            const userId = type === 'user' && userSel ? userSel.value : null;
            const deptId = type === 'department' && deptSel ? deptSel.value : null;
            if (!userId && !deptId) { toast(t('select_assignee'), true); return; }
            const body = { assignedTo: type === 'user' ? userId : null, assignedToDepartmentId: type === 'department' ? deptId : null };
            const statusSel = document.getElementById('taskDetailStatus');
            if (statusSel && statusSel.value) body.status = statusSel.value;
            const dueEl = document.getElementById('taskDetailDueDate');
            if (dueEl) body.dueDate = dueEl.value ? new Date(dueEl.value).toISOString() : null;
            const prioEl = document.getElementById('taskDetailPriority');
            if (prioEl && prioEl.value) body.priority = prioEl.value;
            const branchEl = document.getElementById('taskDetailBranch');
            if (branchEl) body.branchId = branchEl.value || null;
            const res = await apiFetch('/api/tasks/' + currentTaskId, { method: 'PUT', body: JSON.stringify(body) });
            if (res.needLogin) return;
            if (res.ok) { toast(t('toast_status_updated')); loadTaskDetail(currentTaskId); loadTasks(); loadTasksSummary(); } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }
        async function loadTaskDetail(id) {
            currentTaskId = id;
            document.getElementById('taskList').style.display = 'none';
            document.getElementById('taskDetailBox').style.display = 'block';
            const ress = await Promise.all([apiFetch('/api/tasks/' + id), apiFetch('/api/users'), apiFetch('/api/departments'), apiFetch('/api/branches')]);
            const taskRes = ress[0];
            if (taskRes.needLogin) return;
            if (!taskRes.ok) { toast((taskRes.data && taskRes.data.error) || t('err_generic'), true); showTaskList(); return; }
            const taskData = taskRes.data;
            const users = (ress[1].data && ress[1].data.data) || [];
            const depts = (ress[2].data && ress[2].data.data) || [];
            const branches = (ress[3].data && ress[3].data.data) || [];
            const assign = taskData.assignedToDepartmentId && taskData.department ? (LANG === 'fa' ? 'دپارتمان ' : 'Dept ') + escapeHtml(taskData.department.name) + (LANG === 'fa' ? ' (همه اعضا)' : ' (all)') : userDisplay(taskData.assignee) || '\u2014';
            const creator = userDisplay(taskData.creator) || '\u2014';
            const due = taskData.dueDate ? fmtTZ(taskData.dueDate, 'datetime') : '\u2014';
            const statusOpts = ['pending','in_progress','done','cancelled'].map(function(s){ return '<option value="' + s + '"' + (taskData.status === s ? ' selected' : '') + '>' + taskStatusLabel(s) + '</option>'; }).join('');
            const prioOpts = ['low','normal','high','urgent'].map(function(p){ return '<option value="' + p + '"' + ((taskData.priority || 'normal') === p ? ' selected' : '') + '>' + taskPriorityLabel(p) + '</option>'; }).join('');
            const userOpts = users.map(function(u){ return '<option value="' + u.id + '"' + (taskData.assignedTo === u.id ? ' selected' : '') + '>' + escapeHtml(u.username || u.name || u.email) + '</option>'; }).join('');
            const deptOpts = depts.map(function(d){ return '<option value="' + d.id + '"' + (taskData.assignedToDepartmentId === d.id ? ' selected' : '') + '>' + escapeHtml(d.name) + '</option>'; }).join('');
            const branchOpts = '<option value="">' + t('no_branch') + '</option>' + branches.map(function(b){ return '<option value="' + b.id + '"' + (taskData.branchId === b.id ? ' selected' : '') + '>' + escapeHtml(b.name || '') + '</option>'; }).join('');
            const isDept = !!taskData.assignedToDepartmentId;
            const dueVal = taskData.dueDate ? (function(){ const d=new Date(taskData.dueDate); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')+'T'+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'); })() : '';
            const branchName = taskData.branch && taskData.branch.name ? escapeHtml(taskData.branch.name) : '\u2014';
            const editHtml = '<div class="task-detail-edit" style="margin-top:16px; padding-top:16px; border-top:1px solid var(--border);">' +
                '<label>' + t('assign_to') + '</label><div class="task-assign-row"><select id="taskDetailAssignType" onchange="toggleTaskDetailAssign()"><option value="user"' + (!isDept?' selected':'') + '>' + t('assign_user') + '</option><option value="department"' + (isDept?' selected':'') + '>' + t('assign_dept') + '</option></select>' +
                '<select id="taskDetailAssignUser" style="min-width:180px;' + (isDept?' display:none':'') + '"><option value="">' + t('select_user_task') + '</option>' + userOpts + '</select>' +
                '<select id="taskDetailAssignDept" style="min-width:180px;' + (!isDept?' display:none':'') + '"><option value="">' + t('select_dept') + '</option>' + deptOpts + '</select></div>' +
                '<label>' + t('th_branch') + '</label><select id="taskDetailBranch">' + branchOpts + '</select>' +
                '<div class="task-form-row"><div><label>' + t('due_date') + '</label><input id="taskDetailDueDate" type="datetime-local" value="' + dueVal + '"></div>' +
                '<div><label>' + t('ticket_priority') + '</label><select id="taskDetailPriority">' + prioOpts + '</select></div></div>' +
                '<label>' + t('change_status') + '</label><select id="taskDetailStatus">' + statusOpts + '</select>' +
                ' <button type="button" class="btn-primary" id="btnTaskDetailUpdate">' + t('btn_apply') + '</button></div>';
            document.getElementById('taskDetailContent').innerHTML =
                '<div class="form-box" style="max-width:100%;"><h3 style="margin:0 0 8px;">' + escapeHtml(taskData.title) + '</h3>' +
                (taskData.description ? '<p style="color:var(--text-secondary); margin:8px 0;">' + escapeHtml(taskData.description) + '</p>' : '') +
                '<p style="font-size:0.9rem; color:var(--text-muted);">' + t('creator_label') + ' ' + escapeHtml(creator) + ' | ' + t('assignee_label') + ' ' + escapeHtml(assign) + ' | ' + t('due_label') + ' ' + due + ' | ' + t('th_branch') + ': ' + branchName + ' | ' + t('ticket_priority') + ': ' + taskPriorityLabel(taskData.priority) + '</p>' + editHtml;
            const updates = (taskData.updates || []).map(function(u) {
                return '<div class="msg in" style="margin:8px 0;"><div>' + linkifyMessageContent(u.content || '') + '</div><div class="time">' + userDisplayHtml(u.user) + ' \u00B7 ' + (u.createdAt ? fmtTZ(u.createdAt, 'datetime') : '') + '</div></div>';
            }).join('');
            document.getElementById('taskUpdatesList').innerHTML = updates ? '<h4 style="font-size:1rem; margin:12px 0;">' + t('updates') + '</h4>' + updates : '<p class="text-muted" style="color:var(--text-muted);">' + t('no_updates') + '</p>';
            document.getElementById('taskUpdateContent').value = '';
            const detailAssignType = document.getElementById('taskDetailAssignType');
            if (detailAssignType) { detailAssignType.onchange = null; detailAssignType.addEventListener('change', toggleTaskDetailAssign); }
            const delBtn = document.getElementById('taskDeleteBtn');
            if (delBtn) delBtn.style.display = canDeleteThisTask(taskData) ? '' : 'none';
        }
        async function updateTaskStatus() {
            if (!currentTaskId) return;
            const sel = document.getElementById('taskDetailStatus');
            const status = sel ? sel.value : '';
            if (!status) return;
            const res = await apiFetch('/api/tasks/' + currentTaskId, { method: 'PUT', body: JSON.stringify({ status: status }) });
            if (res.needLogin) return;
            if (res.ok) { toast(t('toast_status_updated')); loadTaskDetail(currentTaskId); loadTasks(); loadTasksSummary(); } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }
        async function addTaskUpdate() {
            if (!currentTaskId) return;
            const content = (document.getElementById('taskUpdateContent') && document.getElementById('taskUpdateContent').value) || '';
            const statusChange = document.getElementById('taskUpdateStatusChange') && document.getElementById('taskUpdateStatusChange').value;
            if (!content.trim() && !statusChange) { toast(t('task_update_required'), true); return; }
            const body = { content: content.trim() };
            if (statusChange) body.statusChange = statusChange;
            const res = await apiFetch('/api/tasks/' + currentTaskId + '/updates', { method: 'POST', body: JSON.stringify(body) });
            if (res.needLogin) return;
            if (res.ok) { document.getElementById('taskUpdateContent').value = ''; const sc=document.getElementById('taskUpdateStatusChange'); if(sc)sc.value=''; toast(t('toast_update_added')); loadTaskDetail(currentTaskId); loadTasks(); loadTasksSummary(); } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }

        function initProcessTabs() {
            document.querySelectorAll('.process-tab').forEach(function(btn) {
                btn.onclick = function() {
                    const tab = this.getAttribute('data-tab');
                    document.querySelectorAll('.process-tab').forEach(function(b){ b.classList.remove('active'); });
                    this.classList.add('active');
                    document.querySelectorAll('.process-panel').forEach(function(p){ p.classList.remove('show'); p.style.display = 'none'; });
                    if (tab === 'templates') { document.getElementById('processTemplatesPanel').style.display = 'block'; document.getElementById('processTemplatesPanel').classList.add('show'); loadProcessTemplates(); }
                    else { document.getElementById('processInstancesPanel').style.display = 'block'; document.getElementById('processInstancesPanel').classList.add('show'); loadProcessInstances(); }
                };
            });
        }
        async function loadProcessTemplateSelect() {
            const sel = document.getElementById('processInstanceTemplate');
            const res = await apiFetch('/api/processes/templates');
            if (!res.ok || !res.data || !res.data.data) return;
            const opts = '<option value="">' + t('all_templates') + '</option>' + res.data.data.filter(function(t){ return t.isActive; }).map(function(t){ return '<option value="' + t.id + '">' + escapeHtml(t.name) + '</option>'; }).join('');
            if (sel) sel.innerHTML = opts;
        }
        async function loadProcessTemplates() {
            const list = document.getElementById('processTemplatesList');
            if (!list) return;
            list.innerHTML = '<div class="loading-skeleton loading-row"></div>';
            const res = await apiFetch('/api/processes/templates');
            if (res.needLogin) return;
            if (!res.ok) { list.innerHTML = '<div class="empty">' + t('err_generic') + '</div>'; return; }
            const data = (res.data && res.data.data) || [];
            if (data.length === 0) { list.innerHTML = '<div class="empty"><span class="empty-icon">📋</span><br>' + t('empty_process_templates') + '</div>'; return; }
            list.innerHTML = data.map(function(tpl) {
                const stages = (tpl.stages || []).map(function(s){ return s.name; }).join(' \u2192 ');
                const cnt = (tpl.instanceCount || 0);
                return '<div class="list-item" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">' +
                    '<div><span class="name">' + escapeHtml(tpl.name) + '</span><div class="meta">' + (stages || '—') + ' | ' + (t('process_instances_count') || 'Instances: ') + cnt + '</div></div>' +
                    '<div style="display:flex; gap:6px;"><button type="button" class="btn-secondary" style="padding:6px 12px;" onclick="openProcessStartInstanceModal(\'' + tpl.id + '\')">' + t('process_start_instance') + '</button>' +
                    '<button type="button" class="btn-secondary" style="padding:6px 12px;" onclick="openProcessTemplateModal(\'' + tpl.id + '\')">' + t('edit') + '</button>' +
                    '<button type="button" class="btn-secondary" style="padding:6px 12px;" onclick="deleteProcessTemplate(\'' + tpl.id + '\')">' + (t('btn_delete') || '\u00D7') + '</button></div></div>';
            }).join('');
        }
        async function loadProcessInstances() {
            const list = document.getElementById('processInstancesList');
            const box = document.getElementById('processInstanceDetailBox');
            if (!list) return;
            if (box && box.style.display !== 'none') return;
            list.style.display = 'block';
            list.innerHTML = '<div class="loading-skeleton loading-row"></div>';
            const status = (document.getElementById('processInstanceStatus') && document.getElementById('processInstanceStatus').value) || '';
            const templateId = (document.getElementById('processInstanceTemplate') && document.getElementById('processInstanceTemplate').value) || '';
            let q = '?limit=50';
            if (status) q += '&status=' + encodeURIComponent(status);
            if (templateId) q += '&templateId=' + encodeURIComponent(templateId);
            const res = await apiFetch('/api/processes/instances' + q);
            if (res.needLogin) return;
            if (!res.ok) { list.innerHTML = '<div class="empty">' + t('err_generic') + '</div>'; return; }
            const data = (res.data && res.data.data) || [];
            if (data.length === 0) { list.innerHTML = '<div class="empty"><span class="empty-icon">🔄</span><br>' + t('empty_process_instances') + '</div>'; return; }
            list.innerHTML = data.map(function(i) {
                const statusLabel = i.status === 'active' ? t('status_active') : i.status === 'completed' ? t('status_done') : t('status_cancelled');
                const templateName = (i.template && i.template.name) ? i.template.name : '�';
                const assignee = userDisplayHtml(i.assignee) || '\u2014';
                return '<div class="list-item" onclick="loadProcessInstanceDetail(\'' + i.id + '\')" style="cursor:pointer;"><div><span class="name">' + escapeHtml(i.title) + '</span><div class="meta">' + escapeHtml(templateName) + ' ⬢ ' + assignee + ' ⬢ ' + statusLabel + '</div></div><span class="badge ' + (i.status || '') + '">' + statusLabel + '</span></div>';
            }).join('');
        }
        let currentProcessInstanceId = null;
        function showProcessInstancesList() {
            document.getElementById('processInstanceDetailBox').style.display = 'none';
            document.getElementById('processInstancesList').style.display = 'block';
            currentProcessInstanceId = null;
            loadProcessInstances();
        }
        async function loadProcessInstanceDetail(id) {
            currentProcessInstanceId = id;
            document.getElementById('processInstancesList').style.display = 'none';
            document.getElementById('processInstanceDetailBox').style.display = 'block';
            const res = await apiFetch('/api/processes/instances/' + id);
            if (res.needLogin) return;
            if (!res.ok) { toast((res.data && res.data.error) || t('err_generic'), true); showProcessInstancesList(); return; }
            const i = (res.data && res.data.data) || res.data;
            const template = i.template || {};
            const stages = template.stages || [];
            const currentIdx = i.currentStageIndex != null ? i.currentStageIndex : 0;
            const currentStageName = (stages[currentIdx] && stages[currentIdx].name) ? stages[currentIdx].name : t('process_current_stage');
            const assignee = userDisplayHtml(i.assignee) || '\u2014';
            const creator = userDisplayHtml(i.creator) || '\u2014';
            const stepsHtml = (i.steps || []).map(function(s) {
                const done = s.completedAt ? '\u2713 ' : '';
                return '<div class="msg in" style="margin:6px 0;"><div>' + done + escapeHtml(s.stageName) + (s.notes ? ' \u2014 ' + escapeHtml(s.notes) : '') + '</div><div class="time">' + userDisplayHtml(s.assignee) + ' \u22C6 ' + (s.startedAt ? fmtTZ(s.startedAt, 'datetime') : '') + (s.completedAt ? ' \u2014 ' + fmtTZ(s.completedAt, 'datetime') : '') + '</div></div>';
            }).join('');
            document.getElementById('processInstanceDetailContent').innerHTML =
                '<div class="form-box" style="max-width:100%;"><h3 style="margin:0 0 8px;">' + escapeHtml(i.title) + '</h3>' +
                '<p style="font-size:0.9rem; color:var(--text-muted);">' + t('creator_label') + ' ' + creator + ' | ' + t('assignee_label') + ' ' + assignee + ' | ' + t('process_current_stage') + ': ' + escapeHtml(currentStageName) + '</p>' +
                '<h4 style="font-size:1rem; margin:12px 0;">' + t('history') + '</h4>' + (stepsHtml || '<p class="text-muted">' + (t('no_updates') || '') + '</p>') + '</div>';
            const advanceBox = document.getElementById('processInstanceAdvanceBox');
            if (i.status !== 'active') { advanceBox.innerHTML = ''; return; }
            const isLast = currentIdx >= stages.length - 1;
            advanceBox.innerHTML = '<label>' + t('process_notes') + '</label><textarea id="processAdvanceNotes" rows="2" style="width:100%; margin-bottom:8px;"></textarea>' +
                (isLast ? '<button type="button" class="btn-primary" onclick="advanceProcessInstance(true)">' + t('process_complete') + '</button>' : '<button type="button" class="btn-primary" onclick="advanceProcessInstance(false)">' + t('process_advance') + '</button>');
        }
        async function advanceProcessInstance(complete) {
            if (!currentProcessInstanceId) return;
            const notes = (document.getElementById('processAdvanceNotes') && document.getElementById('processAdvanceNotes').value) || '';
            const res = await apiFetch('/api/processes/instances/' + currentProcessInstanceId + '/advance', { method: 'POST', body: JSON.stringify({ notes: notes }) });
            if (res.needLogin) return;
            if (res.ok) { toast(t('toast_status_updated')); loadProcessInstanceDetail(currentProcessInstanceId); loadProcessInstances(); } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }
        function openProcessTemplateModal(id) {
            document.getElementById('processTemplateId').value = id || '';
            document.getElementById('processTemplateName').value = '';
            document.getElementById('processTemplateDesc').value = '';
            document.getElementById('processTemplateStagesContainer').innerHTML = '';
            document.getElementById('processTemplateModalTitle').textContent = id ? t('edit') : t('process_add_template');
            if (id) {
                apiFetch('/api/processes/templates/' + id).then(function(res) {
                    if (res.ok && res.data) {
                        const t = (res.data.data) ? res.data.data : res.data;
                        document.getElementById('processTemplateName').value = t.name || '';
                        document.getElementById('processTemplateDesc').value = t.description || '';
                        const stages = t.stages || [];
                        stages.forEach(function(s) { addProcessTemplateStageRow(s.name); });
                    }
                });
            } else { addProcessTemplateStageRow(); }
            document.getElementById('modalProcessTemplate').style.display = 'flex';
        }
        function addProcessTemplateStageRow(name) {
            var name = (typeof name === 'string') ? name : '';
            const container = document.getElementById('processTemplateStagesContainer');
            const div = document.createElement('div');
            div.style.cssText = 'display:flex; gap:8px; margin-bottom:8px; align-items:center;';
            div.innerHTML = '<input type="text" class="process-stage-name" data-i18n-ph="process_stage_name" placeholder="' + (t('process_stage_name') || 'نام مرحله') + '" value="' + escapeHtml(name) + '" style="flex:1;"><button type="button" class="btn-secondary" style="padding:4px 10px;" class="process-stage-remove">×</button>';
            const removeStageBtn = div.querySelector('.process-stage-remove');
            if (removeStageBtn) {
                removeStageBtn.removeEventListener('click', function(e) { div.remove(); });
                removeStageBtn.addEventListener('click', function(e) { div.remove(); });
            }
            container.appendChild(div);
        }
        function closeProcessTemplateModal() { document.getElementById('modalProcessTemplate').style.display = 'none'; }
        async function saveProcessTemplate() {
            const id = document.getElementById('processTemplateId').value;
            const name = (document.getElementById('processTemplateName') && document.getElementById('processTemplateName').value) || '';
            if (!name.trim()) { toast(t('dept_name_required'), true); return; }
            const desc = (document.getElementById('processTemplateDesc') && document.getElementById('processTemplateDesc').value) || '';
            const inputs = document.querySelectorAll('#processTemplateStagesContainer .process-stage-name');
            const stages = [];
            inputs.forEach(function(inp, i) { const v = (inp.value || '').trim(); if (v) stages.push({ name: v, order: i }); });
            if (stages.length === 0) { toast(t('process_min_one_stage'), true); return; }
            const body = { name: name.trim(), description: desc, stages: stages };
            const url = id ? '/api/processes/templates/' + id : '/api/processes/templates';
            const method = id ? 'PUT' : 'POST';
            const res = await apiFetch(url, { method: method, body: JSON.stringify(body) });
            if (res.needLogin) return;
            if (res.ok) { closeProcessTemplateModal(); loadProcessTemplates(); loadProcessTemplateSelect(); toast(t('btn_save')); } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }
        async function deleteProcessTemplate(id) {
            if (!confirm(t('process_delete_template_confirm') || (LANG === 'en' ? 'Delete this template?' : 'این قالب حذف شود؟'))) return;
            const res = await apiFetch('/api/processes/templates/' + id, { method: 'DELETE' });
            if (res.ok) { loadProcessTemplates(); loadProcessTemplateSelect(); toast(t('btn_save')); } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }
        function openProcessStartInstanceModal(templateId, refType, refId, suggestedTitle) {
            document.getElementById('processStartRefType').value = refType || '';
            document.getElementById('processStartRefId').value = refId || '';
            document.getElementById('processStartTitle').value = (suggestedTitle && suggestedTitle.trim()) ? suggestedTitle.trim() : '';
            document.getElementById('processStartAssignedTo').value = '';
            apiFetch('/api/processes/templates').then(function(res) {
                const sel = document.getElementById('processStartTemplateSel');
                if (!sel) return;
                const list = (res.data && res.data.data) || [];
                const active = list.filter(function(t){ return t.isActive !== false; });
                sel.innerHTML = '<option value="">' + (t('process_select_template') || t('all_templates')) + '</option>' + active.map(function(t){ return '<option value="' + t.id + '">' + escapeHtml(t.name) + '</option>'; }).join('');
                if (templateId) sel.value = templateId;
            });
            apiFetch('/api/users').then(function(res) {
                const sel = document.getElementById('processStartAssignedTo');
                if (!sel) return;
                const users = (res.data && res.data.data) || [];
                sel.innerHTML = '<option value="">' + t('no_user') + '</option>' + users.map(function(u){ return '<option value="' + u.id + '">' + escapeHtml(u.name) + '</option>'; }).join('');
            });
            document.getElementById('modalProcessStartInstance').style.display = 'flex';
        }
        function closeProcessStartInstanceModal() { document.getElementById('modalProcessStartInstance').style.display = 'none'; }
        async function startProcessInstance() {
            const templateId = (document.getElementById('processStartTemplateSel') && document.getElementById('processStartTemplateSel').value) || '';
            const title = (document.getElementById('processStartTitle') && document.getElementById('processStartTitle').value) || '';
            if (!templateId || !title.trim()) { toast(t('ticket_title_required'), true); return; }
            const assignedTo = (document.getElementById('processStartAssignedTo') && document.getElementById('processStartAssignedTo').value) || null;
            const refType = (document.getElementById('processStartRefType') && document.getElementById('processStartRefType').value) || null;
            const refId = (document.getElementById('processStartRefId') && document.getElementById('processStartRefId').value) || null;
            const body = { templateId: templateId, title: title.trim(), assignedTo: assignedTo || undefined };
            if (refType && refId) { body.referenceType = refType; body.referenceId = refId; }
            const res = await apiFetch('/api/processes/instances', { method: 'POST', body: JSON.stringify(body) });
            if (res.needLogin) return;
            if (res.ok) { closeProcessStartInstanceModal(); loadProcessInstances(); loadProcessTemplates(); toast(t('toast_task_created')); document.querySelectorAll('.process-tab').forEach(function(b){ if(b.getAttribute('data-tab')==='instances') b.click(); }); } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }
        function startProcessFromTicket() {
            if (!currentTicketId) return;
            const titleEl = document.getElementById('ticketDetailTitle');
            const suggestedTitle = titleEl ? titleEl.textContent : '';
            showPage('processes');
            setTimeout(function() {
                loadProcessTemplateSelect();
                openProcessStartInstanceModal(null, 'ticket', currentTicketId, suggestedTitle);
            }, 400);
        }

        async function addTicket() {
            const title = document.getElementById('ticketTitle').value.trim();
            if (!title) { toast(t('ticket_title_required'), true); return; }
            const assigneeEl = document.getElementById('ticketAssignee');
            const deptEl = document.getElementById('ticketDept');
            const dueEl = document.getElementById('ticketDueDate');
            const body = { title: title, description: (document.getElementById('ticketDesc').value || '').trim(), priority: (document.getElementById('ticketPriority').value || 'normal') };
            if (assigneeEl && assigneeEl.value) body.assignedTo = assigneeEl.value;
            if (deptEl && deptEl.value) body.departmentId = deptEl.value;
            if (dueEl && dueEl.value) body.dueDate = dueEl.value;
            const res = await apiFetch('/api/tickets', { method: 'POST', body: JSON.stringify(body) });
            if (res.needLogin) return;
            if (res.ok) { document.getElementById('ticketTitle').value = ''; document.getElementById('ticketDesc').value = ''; const dueInp = document.getElementById('ticketDueDate'); if (dueInp) dueInp.value = ''; document.getElementById('ticketFormBox').style.display = 'none'; toast(t('toast_ticket_created')); loadTickets(); } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }

        let _editingDeptId = null;
        function cancelDeptEdit() {
            _editingDeptId = null;
            document.getElementById('deptName').value = '';
            document.getElementById('deptDesc').value = '';
            document.getElementById('deptKeywords').value = '';
            const colorEl = document.getElementById('deptColor'); if (colorEl) colorEl.value = '#10b981';
            const defEl = document.getElementById('deptIsDefault'); if (defEl) defEl.checked = false;
            const actEl = document.getElementById('deptIsActive'); if (actEl) actEl.checked = true;
            const branchEl = document.getElementById('deptBranch'); if (branchEl) branchEl.value = '';
            const btn = document.getElementById('btnDeptSave'); if (btn) { btn.textContent = t('add_dept'); btn.setAttribute('data-i18n', 'add_dept'); }
            const cancelBtn = document.getElementById('btnDeptCancel'); if (cancelBtn) cancelBtn.style.display = 'none';
        }
        function editDepartment(idx) {
            const list = window._deptListData;
            if (!list || !list[idx]) return;
            const d = list[idx];
            _editingDeptId = d.id;
            document.getElementById('deptName').value = d.name || '';
            document.getElementById('deptDesc').value = d.description || '';
            document.getElementById('deptKeywords').value = d.keywords || '';
            const colorEl = document.getElementById('deptColor'); if (colorEl) colorEl.value = (d.color || '#10b981').replace(/^#?/, '#');
            const defEl = document.getElementById('deptIsDefault'); if (defEl) defEl.checked = !!d.isDefault;
            const actEl = document.getElementById('deptIsActive'); if (actEl) actEl.checked = d.isActive !== false;
            const branchEl = document.getElementById('deptBranch'); if (branchEl) branchEl.value = d.branchId || '';
            const btn = document.getElementById('btnDeptSave'); if (btn) { btn.textContent = t('save_changes'); btn.setAttribute('data-i18n', 'save_changes'); }
            const cancelBtn = document.getElementById('btnDeptCancel'); if (cancelBtn) cancelBtn.style.display = '';
            toast(t('dept_edit_hint'), false);
        }
        function normalizeKeywordsInput(raw) {
            if (!raw || !raw.trim()) return '';
            const parts = raw.split(/[,،;\s]+/).map(function(p) { return p.trim(); }).filter(Boolean);
            const seen = {};
            return parts.filter(function(p) { const k = p.toLowerCase(); if (seen[k]) return false; seen[k] = true; return true; }).join(', ');
        }
        function formatDeptKeywords() {
            const el = document.getElementById('deptKeywords');
            if (!el) return;
            el.value = normalizeKeywordsInput(el.value);
            toast(LANG === 'fa' ? 'کلمات کلیدی مرتب شد' : 'Keywords formatted');
        }
        async function saveDepartment() {
            const name = document.getElementById('deptName').value.trim();
            if (!name) { toast(t('dept_name_required'), true); return; }
            const branchId = document.getElementById('deptBranch').value || null;
            const colorEl = document.getElementById('deptColor');
            const defEl = document.getElementById('deptIsDefault');
            const actEl = document.getElementById('deptIsActive');
            const keywordsRaw = document.getElementById('deptKeywords').value;
            const body = { name: name, description: document.getElementById('deptDesc').value.trim(), keywords: normalizeKeywordsInput(keywordsRaw), branchId: branchId };
            if (colorEl) body.color = colorEl.value || '#10b981';
            if (defEl) body.isDefault = defEl.checked;
            if (actEl) body.isActive = actEl.checked;
            let res;
            if (_editingDeptId) {
                res = await apiFetch('/api/departments/' + _editingDeptId, { method: 'PUT', body: JSON.stringify(body) });
            } else {
                res = await apiFetch('/api/departments', { method: 'POST', body: JSON.stringify(body) });
            }
            if (res.needLogin) return;
            if (res.ok) {
                cancelDeptEdit();
                toast(_editingDeptId ? t('toast_dept_updated') : t('toast_dept_added'));
                loadDepartments();
            } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }

        let userListData = [];
        function initUserFilters() {
            const searchEl = document.getElementById('userSearchInput');
            const roleEl = document.getElementById('userFilterRole');
            const statusEl = document.getElementById('userFilterStatus');
            if (searchEl) searchEl.oninput = searchEl.onkeyup = function() { filterAndRenderUsers(); };
            if (statusEl) statusEl.onchange = function() { filterAndRenderUsers(); };
            if (roleEl) roleEl.onchange = function() {
                document.querySelectorAll('#userRolePills .pill').forEach(function(x) { x.classList.remove('active'); });
                const p = document.querySelector('#userRolePills .pill[data-role="' + (roleEl.value || '') + '"]');
                if (p) p.classList.add('active');
                filterAndRenderUsers();
            };
            document.querySelectorAll('#userRolePills .pill').forEach(function(p) {
                p.onclick = function() {
                    document.querySelectorAll('#userRolePills .pill').forEach(function(x) { x.classList.remove('active'); });
                    this.classList.add('active');
                    const r = this.getAttribute('data-role') || '';
                    if (roleEl) roleEl.value = r;
                    filterAndRenderUsers();
                };
            });
        }
        function initUserEditTabs() {
            document.querySelectorAll('.user-edit-tab').forEach(function(btn) {
                btn.onclick = function() {
                    const tab = this.getAttribute('data-tab');
                    document.querySelectorAll('.user-edit-tab').forEach(function(b) { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
                    document.querySelectorAll('.user-edit-tab-panel').forEach(function(p) { p.classList.remove('active'); p.style.display = 'none'; });
                    this.classList.add('active'); this.setAttribute('aria-selected', 'true');
                    const panel = document.getElementById('userEditTab' + (tab === 'info' ? 'Info' : 'Perms'));
                    if (panel) { panel.classList.add('active'); panel.style.display = 'block'; }
                };
            });
        }
        function userInitial(u) {
            if (u.avatar && String(u.avatar).trim()) return null;
            return (u.name && u.name[0]) ? u.name[0].toUpperCase() : (u.email && u.email[0] ? u.email[0].toUpperCase() : '?');
        }
        function filterAndRenderUsers() {
            const search = (document.getElementById('userSearchInput') && document.getElementById('userSearchInput').value) || '';
            const roleFilter = (document.getElementById('userFilterRole') && document.getElementById('userFilterRole').value) || '';
            const statusFilter = (document.getElementById('userFilterStatus') && document.getElementById('userFilterStatus').value) || '';
            const q = search.trim().toLowerCase();
            const filtered = userListData.filter(function(u) {
                if (statusFilter === 'active' && u.isActive === false) return false;
                if (statusFilter === 'blocked' && u.isActive !== false) return false;
                if (roleFilter && u.role !== roleFilter) return false;
                if (!q) return true;
                const name = (u.name || '').toLowerCase();
                const email = (u.email || '').toLowerCase();
                const username = (u.username || '').toLowerCase();
                return name.indexOf(q) >= 0 || email.indexOf(q) >= 0 || username.indexOf(q) >= 0;
            });
            renderUserList(filtered);
        }
        /* ========== Kaya CRM chunk-05 | کاربران، تیکت، دپارتمان | docs/CODEBASE-MAP.md ========== */
        function renderUserList(users) {
            const list = document.getElementById('userList');
            if (!list) return;
            const canManage = (currentUser && currentUser.permissions && currentUser.permissions.manage_users);
            const canViewActivity = currentUser && ['owner', 'admin', 'manager', 'supervisor'].indexOf(currentUser.role) !== -1;
            const roleLabels = { owner: t('role_owner'), admin: t('role_admin'), manager: t('role_manager'), supervisor: t('role_supervisor'), agent: t('role_agent') };
            const statusLabels = { online: t('status_online'), away: t('status_away') || 'دور', busy: t('status_busy') || 'مشغول', offline: t('status_offline') || 'آفلاین' };
            if (!users || users.length === 0) { list.innerHTML = '<div class="empty" style="grid-column:1/-1;"><span class="empty-icon">👤</span><br>' + t('empty_users') + '</div>'; return; }
            list.innerHTML = users.map(function(u) {
                const initial = userInitial(u) || '?';
                const avatarUrl = (u.avatar && String(u.avatar).trim()) ? ((u.avatar.indexOf('/') === 0 ? (window.location.origin || '') : '') + u.avatar) : '';
                const onerr = 'this.style.display=' + String.fromCharCode(39) + 'none' + String.fromCharCode(39);
                const avatarHtml = avatarUrl ? '<span class="avatar-fallback">' + escapeHtml(initial) + '</span><img src="' + escapeHtml(avatarUrl) + '" alt="" onerror="' + onerr + '">' : initial;
                const deptBranch = [];
                if (u.department && u.department.name) deptBranch.push(escapeHtml(u.department.name));
                if (u.branch && u.branch.name) deptBranch.push(escapeHtml(u.branch.name));
                const statusClass = (u.status && ['online', 'away', 'busy'].indexOf(u.status) !== -1) ? u.status : 'offline';
                const statusLabel = statusLabels[u.status] || statusLabels.offline;
                const lastLoginStr = u.lastLoginAt ? timeAgo(u.lastLoginAt) : (LANG === 'fa' ? 'هرگز' : 'Never');
                const inactiveClass = u.isActive === false ? ' inactive' : '';
                const blockedBadge = u.isActive === false ? '<span class="badge cancelled">' + t('blocked') + '</span>' : '';
                const protectedBadge = u.isProtectedAdmin ? '<span class="badge" style="background:#fff3cd;color:#856404;font-size:11px;">' + (LANG === 'fa' ? 'غیر قابل ویرایش' : 'Protected') + '</span>' : '';
                const roleBadge = '<span class="badge" style="background:var(--accent-soft);color:var(--accent);">' + escapeHtml(roleLabels[u.role] || u.role) + '</span>';
                const statusBadge = '<span class="status-dot ' + statusClass + '" title="' + escapeHtml(statusLabel) + '"></span>';
                const btns = [];
                if (canViewActivity) btns.push('<button type="button" class="btn-secondary btn-sm btn-user-list-staff" data-user-id="' + escapeHtml(u.id) + '">' + t('view_activity') + '</button>');
                if (canManage) btns.push('<button type="button" class="btn-secondary btn-sm btn-user-list-edit" data-user-id="' + escapeHtml(u.id) + '">' + (u.isProtectedAdmin ? (LANG === 'fa' ? 'مشاهده' : 'View') : t('edit_access')) + '</button>');
                const btn = btns.join(' ');
                const cardClickClass = canViewActivity ? ' user-card-clickable' : '';
                const cardDataId = ' data-user-id="' + escapeHtml(u.id) + '"';
                const positionLine = u.position ? '<div class="user-card-meta" style="color:var(--accent);font-weight:500;">' + escapeHtml(u.position) + '</div>' : '';
                return '<div class="user-card' + inactiveClass + cardClickClass + '"' + cardDataId + '><div class="user-card-header"><div class="user-card-avatar">' + avatarHtml + '</div><div class="user-card-name">' + statusBadge + ' ' + escapeHtml(u.name) + ' ' + blockedBadge + ' ' + protectedBadge + '</div></div><div class="user-card-body">' + positionLine + '<div class="user-card-email">' + escapeHtml(u.email || '') + '</div><div class="user-card-meta">' + (deptBranch.length ? deptBranch.join(' · ') : '') + '</div><div class="user-card-meta">' + (LANG === 'fa' ? 'آخرین ورود: ' : 'Last login: ') + lastLoginStr + '</div><div class="user-card-badges">' + roleBadge + '</div></div><div class="user-card-actions">' + btn + '</div></div>';
            }).join('');
        }
        function toggleUserForm() {
            const box = document.getElementById('userFormBox');
            const btnAdd = document.getElementById('btnAddUser');
            const btnCancel = document.getElementById('btnCancelUserForm');
            if (!box) return;
            const visible = box.style.display === 'block';
            box.style.display = visible ? 'none' : 'block';
            if (btnAdd) btnAdd.style.display = visible ? '' : 'none';
            if (btnCancel) btnCancel.style.display = visible ? 'none' : '';
        }
        function initUserAddPerms() {
            const box = document.getElementById('userAddPermsBox');
            const cont = document.getElementById('userAddPerms');
            if (!box || !cont || !(currentUser && currentUser.permissions && currentUser.permissions.manage_users)) return;
            const canGrantManageUsers = (currentUser && (currentUser.role === 'owner' || currentUser.role === 'admin'));
            const html = Object.keys(sectionLabels).map(function(k) {
                if (k === 'manage_users' && !canGrantManageUsers) return '';
                return '<label style="display:block; margin:6px 0;"><input type="checkbox" data-perm="' + k + '"> ' + sectionLabel(k) + '</label>';
            }).join('');
            cont.innerHTML = html;
            box.style.display = 'block';
        }
        async function loadUsers() {
            const list = document.getElementById('userList');
            if (!list) return;
            setLoading('userList', 4);
            const res = await apiFetch('/api/users');
            if (res.needLogin) return;
            if (!res.ok) { list.innerHTML = '<div class="empty">' + t('err_generic') + ': ' + escapeHtml(res.data && res.data.error ? res.data.error : '') + '</div>'; return; }
            const data = res.data || {};
            userListData = data.data || [];
            if (userListData.length === 0) { list.innerHTML = '<div class="empty"><span class="empty-icon">👤</span><br>' + t('empty_users') + '</div>'; return; }
            filterAndRenderUsers();
        }
        let currentEditUserId = null;
        var sectionLabels = { dashboard: 'page_dashboard', conversations: 'section_conversations', customers: 'section_customers', tickets: 'section_tickets', tasks: 'section_tasks', departments: 'section_departments', users: 'section_users', branches: 'section_branches', supervision: 'section_supervision', system_status: 'section_system_status', staff_activity: 'section_staff_activity', announcements: 'section_announcements', internal_chat: 'section_internal_chat', whatsapp: 'section_whatsapp', rates: 'section_rates', services: 'section_services', processes: 'section_processes', panel_settings: 'page_panel_settings', manage_users: 'section_manage_users', manage_tickets: 'section_manage_tickets', view_customer_phone: 'section_view_customer_phone', bulk_messaging: 'section_bulk_messaging' };
        const permGroups = [
            { key: 'communications', title: 'user_perms_group_communications', keys: ['conversations', 'customers', 'tickets', 'internal_chat', 'whatsapp', 'announcements', 'view_customer_phone', 'bulk_messaging'] },
            { key: 'organization', title: 'user_perms_group_organization', keys: ['dashboard', 'departments', 'users', 'branches', 'tasks', 'processes', 'staff_activity', 'supervision', 'system_status'] },
            { key: 'settings', title: 'user_perms_group_settings', keys: ['rates', 'services', 'panel_settings'] },
            { key: 'special', title: 'user_perms_group_special', keys: ['manage_users', 'manage_tickets'] }
        ];
        function sectionLabel(k) { const lbl = t(sectionLabels[k] || k); return (lbl && String(lbl).trim()) ? lbl : (sectionLabels[k] || k); }
        function closeUserEditModal() {
            const modal = document.getElementById('userEditModal');
            if (modal) modal.style.display = 'none';
            currentEditUserId = null;
        }
        function userPermsSelectAll(checked) {
            document.querySelectorAll('#userEditPerms input[data-perm]').forEach(function(cb) { cb.checked = !!checked; });
        }
        function userPermsSelectGroup(groupKey, checked) {
            const group = permGroups.find(function(g) { return g.key === groupKey; });
            if (!group) return;
            group.keys.forEach(function(k) {
                const cb = document.querySelector('#userEditPerms input[data-perm="' + k + '"]');
                if (cb) cb.checked = !!checked;
            });
        }
        async function openUserEdit(userId) {
            const res = await apiFetch('/api/users/' + userId);
            if (res.needLogin || !res.ok) return;
            const u = res.data;
            const isProtected = !!u.isProtectedAdmin;
            currentEditUserId = userId;
            document.querySelectorAll('.user-edit-tab').forEach(function(b) { b.classList.remove('active'); b.setAttribute('aria-selected', b.getAttribute('data-tab') === 'info' ? 'true' : 'false'); if (b.getAttribute('data-tab') === 'info') b.classList.add('active'); });
            document.getElementById('userEditTabInfo').classList.add('active'); document.getElementById('userEditTabInfo').style.display = 'block';
            document.getElementById('userEditTabPerms').classList.remove('active'); document.getElementById('userEditTabPerms').style.display = 'none';
            document.getElementById('userEditId').value = u.id;
            document.getElementById('userEditName').value = u.name || '';
            document.getElementById('userEditUsername').value = u.username || '';
            document.getElementById('userEditEmail').value = u.email || '';
            const phoneEditEl = document.getElementById('userEditPhone');
            if (phoneEditEl) phoneEditEl.value = u.phone || '';
            document.getElementById('userEditRole').value = u.role || 'agent';
            document.getElementById('userEditDept').value = u.departmentId || '';
            document.getElementById('userEditBranch').value = u.branchId || '';
            document.getElementById('userEditActive').checked = u.isActive !== false;
            document.getElementById('userEditPassword').value = '';
            const skillsEl = document.getElementById('userEditSkillsKeywords');
            if (skillsEl) skillsEl.value = (u.settings && u.settings.skillsKeywords) || '';
            const posEl = document.getElementById('userEditPosition');
            if (posEl) posEl.value = u.position || '';
            const waSenderEl = document.getElementById('userEditWhatsappSender');
            if (waSenderEl) waSenderEl.value = u.whatsappSenderName || '';
            const waHonorificEl = document.getElementById('userEditWhatsappHonorific');
            if (waHonorificEl) waHonorificEl.value = u.whatsappHonorific || '';
            const editFields = ['userEditName','userEditUsername','userEditEmail','userEditPhone','userEditRole','userEditDept','userEditBranch','userEditActive','userEditPassword','userEditSkillsKeywords','userEditPosition','userEditWhatsappSender','userEditWhatsappHonorific'];
            editFields.forEach(function(fid) { const el = document.getElementById(fid); if (el) el.disabled = isProtected; });
            let protectedBanner = document.getElementById('userEditProtectedBanner');
            if (!protectedBanner) {
                protectedBanner = document.createElement('div');
                protectedBanner.id = 'userEditProtectedBanner';
                protectedBanner.style.cssText = 'background:#fff3cd;color:#856404;border:1px solid #ffc107;border-radius:8px;padding:10px 14px;margin-bottom:12px;font-size:14px;text-align:center;font-weight:600;';
                const editBody = document.querySelector('.user-edit-body');
                if (editBody) editBody.insertBefore(protectedBanner, editBody.firstChild);
            }
            protectedBanner.style.display = isProtected ? 'block' : 'none';
            protectedBanner.textContent = LANG === 'fa' ? 'این کاربر ادمین اصلی سیستم است و اطلاعات آن غیر قابل ویرایش می‌باشد' : 'This is the main system admin — account info is read-only';
            const modalTitle = document.getElementById('userEditModalTitle');
            if (modalTitle) modalTitle.textContent = isProtected ? (LANG === 'fa' ? 'مشاهده ادمین اصلی (غیر قابل ویرایش)' : 'View Main Admin (Read-only)') : (t('modal_user_edit') || 'ویرایش کاربر');
            const perms = u.permissions || {};
            const canGrantSpecial = (currentUser && (currentUser.role === 'owner' || currentUser.role === 'admin'));
            let html = '';
            permGroups.forEach(function(gr) {
                const visibleKeys = gr.keys.filter(function(k) { return (k !== 'manage_users' && k !== 'manage_tickets') || canGrantSpecial; });
                if (visibleKeys.length === 0) return;
                html += '<div class="user-edit-perm-group" data-group="' + gr.key + '">';
                html += '<div class="user-edit-perm-group-header"><span class="user-edit-perm-group-title">' + (t(gr.title) || gr.key) + '</span><span class="user-edit-perm-group-toggles"><button type="button" class="btn-user-perms-group" onclick="userPermsSelectGroup(\'' + gr.key + '\', true)"' + (isProtected ? ' disabled' : '') + '>' + (t('user_perms_all') || 'همه') + '</button><button type="button" class="btn-user-perms-group" onclick="userPermsSelectGroup(\'' + gr.key + '\', false)"' + (isProtected ? ' disabled' : '') + '>' + (t('user_perms_none') || 'هیچ‌کدام') + '</button></span></div>';
                html += '<div class="user-edit-perm-group-items">';
                visibleKeys.forEach(function(k) {
                    const checked = perms[k] ? ' checked' : '';
                    const lbl = sectionLabel(k);
                    html += '<label class="user-edit-perm-item"><input type="checkbox" data-perm="' + k + '"' + checked + (isProtected ? ' disabled' : '') + '><span class="user-edit-perm-label">' + escapeHtml(lbl) + '</span></label>';
                });
                html += '</div></div>';
            });
            document.getElementById('userEditPerms').innerHTML = html;
            const btnDel = document.getElementById('btnUserDelete');
            if (btnDel) btnDel.style.display = (!isProtected && currentUser && currentUser.canDeleteUser && u.id !== (currentUser && currentUser.id)) ? '' : 'none';
            const btnSave = document.querySelector('.user-edit-footer .btn-primary');
            if (btnSave) btnSave.style.display = isProtected ? 'none' : '';
            const permsAllBtn = document.querySelector('.user-edit-perms-actions .btn-perms-all');
            const permsNoneBtn = document.querySelector('.user-edit-perms-actions .btn-perms-none');
            if (permsAllBtn) permsAllBtn.disabled = isProtected;
            if (permsNoneBtn) permsNoneBtn.disabled = isProtected;
            document.getElementById('userEditModal').style.display = 'flex';
        }
        function openDeleteUserModal() {
            if (!currentEditUserId) return;
            const u = userListData.find(function(x) { return x.id === currentEditUserId; });
            if (!u) return;
            document.getElementById('deleteUserModalText').textContent = (LANG === 'fa' ? 'مکالمات، تسک‌ها، تیکت‌ها و فرایندهای ' : 'Conversations, tasks, tickets and processes of ') + (u.name || u.email) + (LANG === 'fa' ? ' به کاربر انتخابی منتقل و حساب غیرفعال می‌شود.' : ' will be transferred and the account will be deactivated.');
            const sel = document.getElementById('deleteUserTransferTo');
            const others = userListData.filter(function(x) { return x.id !== currentEditUserId && x.isActive !== false; });
            sel.innerHTML = '<option value="">' + (LANG === 'fa' ? 'انتخاب کاربر' : 'Select user') + '</option>' + others.map(function(x) { return '<option value="' + x.id + '">' + escapeHtml(x.name || x.username || x.email) + '</option>'; }).join('');
            const permCb = document.getElementById('deleteUserPermanent');
            if (permCb) permCb.checked = false;
            document.getElementById('deleteUserModal').style.display = 'flex';
        }
        function closeDeleteUserModal() { document.getElementById('deleteUserModal').style.display = 'none'; }
        async function confirmDeleteUser() {
            if (!currentEditUserId) return;
            const transferTo = document.getElementById('deleteUserTransferTo').value;
            if (!transferTo) { toast(LANG === 'fa' ? 'انتخاب کاربر برای انتقال الزامی است' : 'Select user to transfer data to', true); return; }
            const permanent = document.getElementById('deleteUserPermanent') && document.getElementById('deleteUserPermanent').checked;
            const endpoint = permanent ? '/api/users/' + currentEditUserId + '/permanent-delete' : '/api/users/' + currentEditUserId + '/delete-with-transfer';
            const btn = document.getElementById('btnConfirmDeleteUser');
            if (btn) { btn.disabled = true; btn.textContent = LANG === 'fa' ? 'در حال پردازش...' : 'Processing...'; }
            const res = await apiFetch(endpoint, { method: 'POST', body: JSON.stringify({ transferToUserId: transferTo }) });
            if (btn) { btn.disabled = false; btn.textContent = t('user_delete_confirm_btn') || (LANG === 'fa' ? 'حذف و انتقال' : 'Delete & transfer'); }
            if (res.needLogin) return;
            if (res.ok) {
                toast(permanent ? (t('user_permanent_deleted') || (LANG === 'fa' ? 'کاربر به‌طور دائمی حذف شد' : 'User permanently deleted')) : (t('user_deleted_transferred') || (LANG === 'fa' ? 'کاربر غیرفعال و داده‌ها منتقل شد' : 'User deactivated and data transferred')));
                closeDeleteUserModal(); closeUserEditModal(); loadUsers();
            } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }
        async function saveUserEdit() {
            if (!currentEditUserId) return;
            const perms = {};
            document.querySelectorAll('#userEditPerms input[data-perm]').forEach(function(cb) {
                perms[cb.getAttribute('data-perm')] = cb.checked;
            });
            const skillsEl = document.getElementById('userEditSkillsKeywords');
            const posEl = document.getElementById('userEditPosition');
            const waSenderEl = document.getElementById('userEditWhatsappSender');
            const waHonorificEl = document.getElementById('userEditWhatsappHonorific');
            const editEmail = document.getElementById('userEditEmail').value.trim();
            if (!editEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editEmail)) { toast(LANG === 'fa' ? 'فرمت ایمیل نامعتبر است' : 'Invalid email format', true); return; }
            const payload = {
                name: document.getElementById('userEditName').value.trim(),
                username: document.getElementById('userEditUsername').value.trim() || null,
                email: editEmail,
                phone: (document.getElementById('userEditPhone') && document.getElementById('userEditPhone').value.trim()) || null,
                role: document.getElementById('userEditRole').value,
                position: posEl ? posEl.value.trim() || null : undefined,
                whatsappSenderName: waSenderEl ? waSenderEl.value.trim() || null : undefined,
                whatsappHonorific: waHonorificEl ? waHonorificEl.value.trim() || null : undefined,
                departmentId: document.getElementById('userEditDept').value || null,
                branchId: document.getElementById('userEditBranch').value || null,
                isActive: document.getElementById('userEditActive').checked,
                permissions: perms,
                skillsKeywords: skillsEl ? skillsEl.value.trim() || null : null
            };
            const pw = document.getElementById('userEditPassword').value;
            if (pw) {
                if (pw.length < 6) { toast(LANG === 'fa' ? 'رمز عبور حداقل ۶ کاراکتر باشد' : 'Password must be at least 6 characters', true); return; }
                payload.password = pw;
            }
            const res = await apiFetch('/api/users/' + currentEditUserId, { method: 'PUT', body: JSON.stringify(payload) });
            if (res.needLogin) return;
            if (res.ok) { toast(t('saved')); closeUserEditModal(); loadUsers(); if (currentEditUserId === (currentUser && currentUser.id)) { apiFetch('/api/users/me').then(function(r) { if (r.ok && r.data) { currentUser = r.data; applyNavByRole(); } }); } } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }

        async function loadDeptsForUser() {
            const res = await apiFetch('/api/departments');
            if (res.needLogin) return;
            const arr = (res.data && res.data.data) || [];
            const opt = '<option value="">' + t('no_dept') + '</option>' + arr.map(function(d) { return '<option value="' + d.id + '">' + escapeHtml(d.name) + '</option>'; }).join('');
            ['userDept','userEditDept'].forEach(function(id) { const el = document.getElementById(id); if (el) el.innerHTML = opt; });
        }

        async function addUser() {
            if (!(currentUser && currentUser.permissions && currentUser.permissions.manage_users)) { toast(t('manage_users_required'), true); return; }
            const name = document.getElementById('userName').value.trim();
            const email = document.getElementById('userEmailAdd').value.trim();
            const password = document.getElementById('userPass').value;
            if (!name || !email || !password) { toast(t('required_name_email_pass'), true); return; }
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast(LANG === 'fa' ? 'فرمت ایمیل نامعتبر است' : 'Invalid email format', true); return; }
            if (password.length < 6) { toast(LANG === 'fa' ? 'رمز عبور حداقل ۶ کاراکتر باشد' : 'Password must be at least 6 characters', true); return; }
            const username = (document.getElementById('userUsernameAdd') && document.getElementById('userUsernameAdd').value) ? document.getElementById('userUsernameAdd').value.trim() : null;
            const branchId = document.getElementById('userBranch').value || null;
            const deptId = document.getElementById('userDept').value || null;
            const perms = {};
            const permsEl = document.getElementById('userAddPerms');
            if (permsEl) permsEl.querySelectorAll('input[data-perm]').forEach(function(cb) { perms[cb.getAttribute('data-perm')] = cb.checked; });
            const skillsEl = document.getElementById('userSkillsAdd');
            const skillsKeywords = (skillsEl && skillsEl.value.trim()) || null;
            const positionEl = document.getElementById('userPositionAdd');
            const positionVal = (positionEl && positionEl.value.trim()) || null;
            const waSenderAdd = document.getElementById('userWhatsappSenderAdd');
            const whatsappSenderName = (waSenderAdd && waSenderAdd.value.trim()) || null;
            const phoneAddEl = document.getElementById('userPhoneAdd');
            const phoneVal = (phoneAddEl && phoneAddEl.value.trim()) || null;
            const res = await apiFetch('/api/users', { method: 'POST', body: JSON.stringify({ name: name, username: username, email: email, password: password, phone: phoneVal, role: document.getElementById('userRole').value, departmentId: deptId, branchId: branchId, permissions: perms, skillsKeywords: skillsKeywords, position: positionVal, whatsappSenderName: whatsappSenderName }) });
            if (res.needLogin) return;
            if (res.ok) {
                document.getElementById('userName').value = '';
                if (document.getElementById('userUsernameAdd')) document.getElementById('userUsernameAdd').value = '';
                document.getElementById('userEmailAdd').value = '';
                if (phoneAddEl) phoneAddEl.value = '';
                document.getElementById('userPass').value = '';
                if (document.getElementById('userSkillsAdd')) document.getElementById('userSkillsAdd').value = '';
                if (positionEl) positionEl.value = '';
                if (waSenderAdd) waSenderAdd.value = '';
                toast(LANG === 'fa' ? 'کاربر ثبت شد؛ ایمیل/واتساپ/تلگرام در حال ارسال است' : 'User created; notifications are being sent'); loadUsers(); toggleUserForm();
            } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }

        var currentInternalThreadId = null;
        let currentInternalThreadOtherUserId = null;
        let currentInternalThreadParticipants = [];
        var internalCallPeers = {};
        var internalCallIceQueue = {};
        var internalCallLocalStream = null;
        var internalCallPendingOffer = null;
        var internalCallPendingInvite = null;
        var internalCallIsIncoming = false;
        var internalCallIsJoining = false;
        var internalCallType = 'voice';
        let internalCallMicMuted = false;
        let internalCallCameraOff = false;
        let internalCallStartedAt = null;
        let internalCallDurationInterval = null;
        let internalCallMarkedConnected = false;
        // STUN: Cloudflare + stunprotocol first so WebRTC can work when Google is unreachable
        var INTERNAL_CALL_ICE_SERVERS = [
            { urls: 'stun:stun.cloudflare.com:3478' },
            { urls: 'stun:stun.stunprotocol.org:3478' },
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' }
        ];
        (function loadWebrtcIceFromConfig() {
            try {
                fetch((typeof API !== 'undefined' ? API : '') + '/api/config')
                    .then(function (r) { return r.json(); })
                    .then(function (c) {
                        if (c && Array.isArray(c.webrtcIceServers) && c.webrtcIceServers.length) {
                            INTERNAL_CALL_ICE_SERVERS = c.webrtcIceServers.concat(INTERNAL_CALL_ICE_SERVERS);
                        }
                    })
                    .catch(function () {});
            } catch (_e) {}
        })();
        function peerKey(id) {
            return id == null ? '' : String(id);
        }
        function isSameCallThread(threadId) {
            if (threadId == null) return false;
            var tid = String(threadId);
            if (currentInternalThreadId && String(currentInternalThreadId) === tid) return true;
            if (internalCallPendingOffer && String(internalCallPendingOffer.threadId) === tid) return true;
            if (internalCallPendingInvite && String(internalCallPendingInvite.threadId) === tid) return true;
            return false;
        }
        function enqueueIceCandidate(fromUserId, candidate) {
            var key = peerKey(fromUserId);
            if (!key || !candidate) return;
            if (!internalCallIceQueue[key]) internalCallIceQueue[key] = [];
            internalCallIceQueue[key].push(candidate);
        }
        function flushIceQueue(fromUserId, pc) {
            var key = peerKey(fromUserId);
            var queue = internalCallIceQueue[key] || [];
            internalCallIceQueue[key] = [];
            if (!pc) return;
            queue.forEach(function(c) {
                if (c) pc.addIceCandidate(new RTCIceCandidate(c)).catch(function(e) { console.warn('addIce:', e); });
            });
        }
        function getOrCreateRemoteAudioEl(userId) {
            var sink = document.getElementById('internalCallRemoteAudioSink');
            if (!sink) return null;
            var id = 'internalCallRemoteAudio_' + peerKey(userId);
            var el = document.getElementById(id);
            if (!el) {
                el = document.createElement('audio');
                el.id = id;
                el.autoplay = true;
                el.playsInline = true;
                el.setAttribute('playsinline', '');
                el.setAttribute('autoplay', '');
                sink.appendChild(el);
            }
            return el;
        }
        function removeRemoteAudioEl(userId) {
            var el = document.getElementById('internalCallRemoteAudio_' + peerKey(userId));
            if (el) { el.srcObject = null; el.remove(); }
        }
        function attachRemoteStream(userId, stream) {
            if (!stream) return;
            var audioEl = getOrCreateRemoteAudioEl(userId);
            if (audioEl) {
                audioEl.srcObject = stream;
                audioEl.muted = false;
                audioEl.volume = 1;
                var playP = audioEl.play();
                if (playP && playP.catch) playP.catch(function() {});
            }
            if (internalCallType === 'video') {
                var rv = getOrCreateRemoteVideoEl(userId);
                if (rv) {
                    rv.srcObject = stream;
                    rv.play().catch(function() {});
                }
            }
        }
        function createCallPeerConnection(remoteUserId) {
            var toId = peerKey(remoteUserId);
            var pc = new RTCPeerConnection({ iceServers: INTERNAL_CALL_ICE_SERVERS, iceCandidatePoolSize: 4 });
            internalCallPeers[toId] = pc;
            attachPeerConnectionStateHandlers(pc, toId);
            if (internalCallLocalStream) {
                internalCallLocalStream.getTracks().forEach(function(tr) { pc.addTrack(tr, internalCallLocalStream); });
            }
            pc.onicecandidate = function(e) {
                var s = getSocket();
                if (e.candidate && s) s.emit('call_ice', { toUserId: toId, threadId: currentInternalThreadId, candidate: e.candidate });
            };
            pc.ontrack = function(e) {
                var stream = (e.streams && e.streams[0]) || (e.track ? new MediaStream([e.track]) : null);
                attachRemoteStream(toId, stream);
            };
            return pc;
        }
        function markInternalCallConnected() {
            if (internalCallMarkedConnected) return;
            internalCallMarkedConnected = true;
            stopCallRingtone();
            var statusEl = document.getElementById('internalCallStatus');
            if (statusEl) statusEl.textContent = t('in_call');
            startInternalCallDurationTimer();
            var rejectBtn = document.getElementById('internalCallRejectBtn');
            var endBtn = document.getElementById('internalCallEndBtn');
            if (rejectBtn) rejectBtn.style.display = 'none';
            if (endBtn) endBtn.style.display = 'flex';
            var addBtn = document.getElementById('internalCallAddBtn');
            if (addBtn) addBtn.style.display = 'flex';
            playCallConnected();
        }
        function mediaErrorMessage(err) {
            var name = (err && err.name) || '';
            if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
                return LANG === 'fa' ? 'دسترسی میکروفون/دوربین رد شد. در تنظیمات مرورگر اجازه دهید.' : 'Microphone/camera permission denied. Allow access in browser settings.';
            }
            if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
                return LANG === 'fa' ? 'میکروفون یا دوربین پیدا نشد.' : 'No microphone or camera found.';
            }
            if (name === 'NotReadableError' || name === 'TrackStartError') {
                return LANG === 'fa' ? 'دستگاه در حال استفاده توسط برنامهٔ دیگری است.' : 'Device is busy in another application.';
            }
            return (name || 'Error') + ': ' + ((err && err.message) || '');
        }
        function getInternalCallTargets() {
            var me = String((currentUser && currentUser.id) || '');
            var parts = (currentInternalThreadParticipants || []).filter(function (p) {
                return String(p.id) !== me;
            });
            if (parts.length) return parts.map(function (p) { return String(p.id); });
            if (currentInternalThreadOtherUserId) return [String(currentInternalThreadOtherUserId)];
            return [];
        }
        function formatPresenceLabel(user) {
            if (!user) return t('last_seen') || (LANG === 'fa' ? 'آخرین بازدید' : 'Last seen');
            var st = user.status || 'offline';
            if (st === 'online') return t('status_online') || (LANG === 'fa' ? 'آنلاین' : 'Online');
            if (st === 'busy') return t('status_busy') || (LANG === 'fa' ? 'مشغول' : 'Busy');
            if (st === 'away') return t('status_away') || (LANG === 'fa' ? 'دور' : 'Away');
            if (user.lastSeenAt && typeof formatInternalListTime === 'function') {
                return (t('last_seen') || (LANG === 'fa' ? 'آخرین بازدید' : 'Last seen')) + ': ' + formatInternalListTime(user.lastSeenAt);
            }
            if (user.lastLoginAt && typeof formatInternalListTime === 'function') {
                return (t('last_seen') || (LANG === 'fa' ? 'آخرین بازدید' : 'Last seen')) + ': ' + formatInternalListTime(user.lastLoginAt);
            }
            return t('status_offline') || (LANG === 'fa' ? 'آفلاین' : 'Offline');
        }
        function updateInternalChatHeaderPresence(thread) {
            var statusEl = document.getElementById('internalChatHeaderStatus');
            var avatarEl = document.getElementById('internalChatHeaderAvatar');
            if (!statusEl) return;
            var others = (thread && thread.participants) || currentInternalThreadParticipants || [];
            if (thread && thread.isGroup) {
                var online = others.filter(function (p) { return p.status === 'online'; }).length;
                statusEl.textContent = (others.length + ' ' + (t('members') || (LANG === 'fa' ? 'عضو' : 'members')))
                    + (online ? (' · ' + online + ' ' + (t('status_online') || 'online')) : '');
                statusEl.classList.toggle('is-online', online > 0);
                if (avatarEl) avatarEl.classList.remove('is-online');
                return;
            }
            var other = others[0];
            statusEl.textContent = formatPresenceLabel(other);
            statusEl.classList.toggle('is-online', !!(other && other.status === 'online'));
            if (avatarEl) avatarEl.classList.toggle('is-online', !!(other && other.status === 'online'));
        }
        function threadDisplayName(th) {
            if (!th) return t('chat') || 'Chat';
            if (th.displayName) return th.displayName;
            if (th.name) return th.name;
            return (th.participants || []).map(function (p) { return p.name || p.email || ''; }).filter(Boolean).join(', ') || (t('chat') || 'Chat');
        }
        function getSocket() { return socket; }
        function getInternalCallOtherDisplay() {
            const id = currentInternalThreadOtherUserId || (internalCallPendingInvite && internalCallPendingInvite.fromUserId) || (internalCallPendingOffer && internalCallPendingOffer.fromUserId);
            if (!id) return { name: '', initial: '?' };
            const p = (currentInternalThreadParticipants || []).find(function(x) { return String(x.id) === String(id); });
            const name = (p && (p.name || p.email)) || (internalCallPendingInvite && internalCallPendingInvite.fromUserName) || '';
            const initial = (name && name.trim()[0]) ? name.trim()[0].toUpperCase() : '?';
            return { name: name || (LANG === 'fa' ? 'طرف تماس' : 'Contact'), initial: initial };
        }
        function formatCallDuration(ms) {
            let s = Math.floor(ms / 1000);
            const m = Math.floor(s / 60);
            s = s % 60;
            return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
        }
        function startInternalCallDurationTimer() {
            if (internalCallDurationInterval) return;
            internalCallStartedAt = internalCallStartedAt || Date.now();
            const el = document.getElementById('internalCallDuration');
            if (el) { el.style.display = 'block'; el.textContent = formatCallDuration(0); }
            internalCallDurationInterval = setInterval(function() {
                const el = document.getElementById('internalCallDuration');
                if (el) el.textContent = formatCallDuration(Date.now() - internalCallStartedAt);
            }, 1000);
        }
        function stopInternalCallDurationTimer() {
            if (internalCallDurationInterval) { clearInterval(internalCallDurationInterval); internalCallDurationInterval = null; }
            internalCallStartedAt = null;
            const el = document.getElementById('internalCallDuration');
            if (el) el.style.display = 'none';
        }
        function updateInternalCallConnectionStatus(text, stateClass) {
            const el = document.getElementById('internalCallConnectionStatus');
            if (!el) return;
            el.textContent = text || '';
            el.style.display = text ? 'block' : 'none';
            el.className = 'internal-call-connection-status' + (stateClass ? ' ' + stateClass : '');
        }
        function attachPeerConnectionStateHandlers(pc, userId) {
            if (!pc) return;
            var failedToast = false;
            function updateState() {
                const state = pc.iceConnectionState || (pc.connectionState || '');
                if (state === 'connected' || state === 'completed') {
                    updateInternalCallConnectionStatus(t('call_connected') || 'متصل', 'connected');
                    markInternalCallConnected();
                } else if (state === 'connecting' || state === 'checking') {
                    updateInternalCallConnectionStatus(t('call_connecting') || 'در حال اتصال...', 'connecting');
                } else if (state === 'failed') {
                    updateInternalCallConnectionStatus(t('call_failed') || 'خطا در اتصال', 'failed');
                    try { if (typeof pc.restartIce === 'function') pc.restartIce(); } catch (e) {}
                    if (!failedToast) {
                        failedToast = true;
                        toast(t('call_failed') || (LANG === 'fa' ? 'اتصال تماس برقرار نشد' : 'Call connection failed'), true);
                    }
                } else if (state === 'disconnected') {
                    updateInternalCallConnectionStatus(t('call_connecting') || 'در حال اتصال...', 'connecting');
                }
            }
            pc.oniceconnectionstatechange = updateState;
            try { pc.onconnectionstatechange = updateState; } catch (e) {}
            updateState();
        }
        function getOrCreateRemoteVideoEl(userId) {
            const container = document.getElementById('internalCallRemoteVideos');
            if (!container) return null;
            const id = 'internalCallRemoteVideo_' + peerKey(userId);
            let el = document.getElementById(id);
            if (!el) { el = document.createElement('video'); el.id = id; el.className = 'internal-call-remote-video'; el.autoplay = true; el.playsInline = true; container.appendChild(el); }
            return el;
        }
        function removeRemoteVideoEl(userId) {
            const el = document.getElementById('internalCallRemoteVideo_' + peerKey(userId));
            if (el) { el.srcObject = null; el.remove(); }
        }
        let internalThreadsCache = [];
        async function loadInternalThreads() {
            const list = document.getElementById('internalThreadList');
            if (!list) return;
            list.innerHTML = t('loading');
            const res = await apiFetch('/api/internal/threads');
            if (res.needLogin) return;
            if (!res.ok) { list.innerHTML = '<div class="empty">' + t('loading_err') + '</div>'; return; }
            const data = (res.data && res.data.data) || [];
            internalThreadsCache = data;
            if (res.data && typeof res.data.totalUnread === 'number') {
                window.navBadgeCounts = window.navBadgeCounts || {};
                window.navBadgeCounts['internal-chat'] = res.data.totalUnread || 0;
                window.hasNewInternalChat = res.data.totalUnread > 0;
                if (typeof updateNavBadges === 'function') updateNavBadges();
            }
            refreshInternalThreadList();
            updateInternalChatFloatingBtn();
        }
        function formatInternalListTime(iso) {
            if (!iso) return '';
            var dt = new Date(iso);
            if (isNaN(dt.getTime())) return '';
            var now = new Date();
            var startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            var startThat = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
            var diff = Math.round((startToday - startThat) / 86400000);
            if (diff === 0) return fmtTZ(iso, 'time');
            if (diff === 1) return t('yesterday') || (LANG === 'fa' ? 'دیروز' : (LANG === 'tr' ? 'Dün' : 'Yesterday'));
            return fmtTZ(iso, 'date');
        }
        function formatInternalDayLabel(iso) {
            if (!iso) return '';
            var dt = new Date(iso);
            if (isNaN(dt.getTime())) return '';
            var now = new Date();
            var startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            var startThat = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
            var diff = Math.round((startToday - startThat) / 86400000);
            if (diff === 0) return t('preset_today') || (LANG === 'fa' ? 'امروز' : 'Today');
            if (diff === 1) return t('yesterday') || (LANG === 'fa' ? 'دیروز' : (LANG === 'tr' ? 'Dün' : 'Yesterday'));
            return fmtTZ(iso, 'date');
        }
        function internalDayKey(iso) {
            var dt = new Date(iso);
            if (isNaN(dt.getTime())) return '';
            return dt.getFullYear() + '-' + (dt.getMonth() + 1) + '-' + dt.getDate();
        }
        function internalChatEmptyVisualHtml() {
            return '<div class="empty-visual" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg></div>';
        }
        function internalLastMessagePreview(th) {
            const m = th && th.lastMessage;
            if (!m) return '\u2014';
            const atts = m.attachments || [];
            const placeholder = typeof isInternalPlaceholderContent === 'function' && isInternalPlaceholderContent(m.content);
            if ((placeholder || !String(m.content || '').trim()) && atts.length) {
                const a = atts[0];
                const kind = a && typeof internalAttachmentKind === 'function' ? internalAttachmentKind(a) : '';
                if (kind === 'image') return t('internal_photo') || (LANG === 'fa' ? 'تصویر' : 'Photo');
                if (kind === 'video') return t('internal_video') || (LANG === 'fa' ? 'ویدیو' : 'Video');
                if (kind === 'audio') return t('internal_audio') || (LANG === 'fa' ? 'صوت' : 'Audio');
                if (kind === 'pdf') return t('internal_document') || (LANG === 'fa' ? 'سند' : 'Document');
                return (a && a.name) || (t('file') || 'File');
            }
            return String(m.content || '').replace(/\s+/g, ' ').trim() || '\u2014';
        }
        function refreshInternalThreadList() {
            const q = document.getElementById('internalChatSearch');
            filterInternalThreads(q ? q.value : '');
        }
        function renderInternalThreadList(data) {
            const list = document.getElementById('internalThreadList');
            if (!list) return;
            list.classList.remove('empty');
            if (data.length === 0) {
                list.innerHTML = '<div class="internal-chat-empty-state">' + internalChatEmptyVisualHtml() + '<p>' + escapeHtml(t('start_chat_hint') || '') + '</p><button type="button" class="btn-primary internal-chat-empty-new-btn">' + escapeHtml(t('start_chat')) + '</button></div>';
                return;
            }
            const me = (currentUser && currentUser.id) || '';
            list.innerHTML = data.map(function(th) {
                const participants = th.participants || [];
                const title = threadDisplayName(th);
                const first = participants[0];
                const online = !th.isGroup && first && first.status === 'online';
                const initial = th.isGroup ? '\uD83D\uDC65' : ((first && (first.name || first.email || '').trim()[0]) ? (first.name || first.email || '').trim()[0].toUpperCase() : '\u003F');
                const avatarUrl = !th.isGroup ? resolveAvatarUrl(first && first.avatar) : '';
                const avatarHtml = avatarUrl ? '<span class="avatar-fallback">' + escapeHtml(initial) + '</span><img src="' + escapeHtml(avatarUrl) + '" alt="" onerror="this.style.display=\'none\'">' : escapeHtml(initial);
                const lastRaw = internalLastMessagePreview(th);
                const mine = th.lastMessage && th.lastMessage.fromUser && String(th.lastMessage.fromUser.id) === String(me);
                const fromLabel = th.lastMessage ? (mine ? ((t('you') || (LANG === 'fa' ? 'شما' : 'You')) + ': ') : ((th.lastMessage.fromUser && th.lastMessage.fromUser.name) ? (th.lastMessage.fromUser.name + ': ') : '')) : '';
                const timeStr = th.lastMessageAt ? formatInternalListTime(th.lastMessageAt) : '';
                const unread = th.unreadCount > 0 ? '<span class="internal-chat-unread-pill">' + (th.unreadCount > 99 ? '99+' : th.unreadCount) + '</span>' : '';
                const groupBadge = th.isGroup ? '<span class="internal-chat-group-badge">' + escapeHtml(t('group_chat') || (LANG === 'fa' ? 'گروه' : 'Group')) + '</span>' : '';
                const selected = currentInternalThreadId && String(th.id) === String(currentInternalThreadId) ? ' is-active' : '';
                const currentAttr = selected ? ' aria-current="true"' : '';
                return '<div class="list-item internal-chat-thread-item' + (th.unreadCount > 0 ? ' has-unread' : '') + selected + '" data-id="' + escapeHtml(th.id) + '" role="button" tabindex="0"' + currentAttr + '><div class="list-item-avatar internal-chat-thread-avatar' + (online ? ' is-online' : '') + '">' + avatarHtml + '</div><div class="list-item-body"><span class="name">' + groupBadge + escapeHtml(title) + '</span><div class="meta">' + escapeHtml(fromLabel + lastRaw) + '</div></div><span class="internal-chat-thread-meta-end"><span class="internal-chat-thread-time">' + escapeHtml(timeStr) + '</span>' + unread + '</span></div>';
            }).join('');
        }
        function filterInternalThreads(q) {
            q = (q || '').trim().toLowerCase();
            if (!q) { renderInternalThreadList(internalThreadsCache); return; }
            const filtered = internalThreadsCache.filter(function(th) {
                const names = threadDisplayName(th).toLowerCase() + ' ' + (th.participants || []).map(function(p) { return (p.name || '') + ' ' + (p.email || ''); }).join(' ').toLowerCase();
                const last = internalLastMessagePreview(th).toLowerCase();
                return names.indexOf(q) >= 0 || last.indexOf(q) >= 0;
            });
            if (!filtered.length) {
                const list = document.getElementById('internalThreadList');
                if (!list) return;
                list.classList.remove('empty');
                list.innerHTML = '<div class="internal-chat-empty-state">' + internalChatEmptyVisualHtml() + '<p>' + escapeHtml(t('internal_no_match') || (LANG === 'fa' ? 'گفتگویی پیدا نشد' : 'No conversations found')) + '</p></div>';
                return;
            }
            renderInternalThreadList(filtered);
        }
        function updateInternalChatFloatingBtn() {
            const btn = document.getElementById('internalChatFloatingBtn');
            const popup = document.getElementById('internalChatPopup');
            const perms = (currentUser && currentUser.permissions) || {};
            const hasAccess = perms.internal_chat !== false;
            if (!btn) return;
            if (!hasAccess) { btn.style.display = 'none'; return; }
            btn.style.display = 'flex';
            const badge = document.getElementById('internalChatFloatingBadge');
            if (badge) {
                var n = (window.navBadgeCounts && window.navBadgeCounts['internal-chat']) || 0;
                badge.style.display = n > 0 || window.hasNewInternalChat ? 'flex' : 'none';
                badge.textContent = n > 99 ? '99+' : String(n || (window.hasNewInternalChat ? 1 : 0));
            }
        }
        function toggleInternalChatFloating() {
            const popup = document.getElementById('internalChatPopup');
            if (popup && popup.style.display !== 'none') { popup.classList.remove('minimized'); popup.style.display = 'flex'; return; }
            if (currentInternalThreadId) {
                const headerEl = document.getElementById('internalChatHeader');
                const name = (headerEl && headerEl.textContent) ? headerEl.textContent.trim() : (LANG === 'fa' ? 'چت' : 'Chat');
                showInternalChatPopup(currentInternalThreadId, name);
            } else { openInternalChatPopupPicker(); }
        }
        function selectThreadInPopup(threadId) {
            const t = (internalThreadsCache || []).find(function(x) { return sameInternalId(x.id, threadId); });
            const names = (t && (t.participants || []).map(function(p) { return p.name || p.email || ''; }).join(', ')) || (LANG === 'fa' ? 'چت' : 'Chat');
            showInternalChatPopup(threadId, names);
        }
        async function openInternalChatPopupPicker() {
            const popup = document.getElementById('internalChatPopup');
            const titleEl = document.getElementById('internalChatPopupTitle');
            const listEl = document.getElementById('internalChatPopupThreadList');
            const messagesEl = document.getElementById('internalChatPopupMessages');
            const quickEl = document.getElementById('internalChatPopupQuickReplies');
            const sendWrap = document.querySelector('.internal-chat-popup-send');
            if (!popup || !listEl) return;
            if (titleEl) titleEl.textContent = LANG === 'fa' ? 'چت داخلی' : 'Internal chat';
            listEl.style.display = 'flex';
            listEl.innerHTML = '<div class="loading-skeleton loading-row"></div>';
            if (messagesEl) messagesEl.style.display = 'none';
            if (quickEl) quickEl.style.display = 'none';
            if (sendWrap) sendWrap.style.display = 'none';
            popup.style.display = 'flex';
            const btn = document.getElementById('internalChatFloatingBtn');
            if (btn) btn.classList.add('internal-chat-floating-btn-open');
            try {
                const res = await apiFetch('/api/internal/threads');
                if (res.needLogin || !res.ok) { listEl.innerHTML = '<div class="empty">' + (t('loading_err') || '') + '</div>'; return; }
                const data = (res.data && res.data.data) || [];
                internalThreadsCache = data;
                const me = (currentUser && currentUser.id) || '';
                const itemsHtml = data.map(function(th) {
                    const participants = th.participants || [];
                    const names = participants.map(function(p) { return p.name || p.email || ''; }).join(', ');
                    const first = participants[0];
                    const initial = (first && (first.name || first.email || '').trim()[0]) ? (first.name || first.email || '').trim()[0].toUpperCase() : '\u003F';
                    const avatarUrl = resolveAvatarUrl(first && first.avatar);
                    const avatarHtml = avatarUrl ? '<span class="avatar-fallback">' + escapeHtml(initial) + '</span><img src="' + escapeHtml(avatarUrl) + '" alt="" onerror="this.style.display=\'none\'">' : escapeHtml(initial);
                    const last = internalLastMessagePreview(th);
                    const timeStr = th.lastMessageAt ? fmtTZ(th.lastMessageAt, 'time') : '';
                    return '<button type="button" class="internal-chat-popup-thread-item" data-id="' + escapeHtml(th.id) + '"><span class="internal-chat-popup-thread-avatar">' + avatarHtml + '</span><div class="internal-chat-popup-thread-body"><span class="internal-chat-popup-thread-name">' + escapeHtml(names || t('chat')) + '</span><div class="internal-chat-popup-thread-meta">' + escapeHtml(last) + '</div></div><span class="internal-chat-popup-thread-time">' + escapeHtml(timeStr) + '</span></button>';
                }).join('');
                const newBtn = '<button type="button" class="internal-chat-popup-new-btn">' + (LANG === 'fa' ? '\u2795 گفتگوی جدید' : '+ New conversation') + '</button>';
                listEl.innerHTML = (data.length === 0 ? '<div class="empty internal-chat-empty-state"><span class="empty-icon">\uD83D\uDCAC</span><p>' + (t('start_chat_hint') || '') + '</p></div>' : '') + itemsHtml + newBtn;
            } catch (e) {
                listEl.innerHTML = '<div class="empty">' + (t('loading_err') || '') + '</div>';
            }
        }
        let internalUsersCache = [];
        let internalNewChatSelected = new Set();
        function sameInternalId(a, b) {
            return String(a || '') === String(b || '');
        }
        function persistInternalThreadId(threadId) {
            try { if (threadId) sessionStorage.setItem('kaya_internal_thread', String(threadId)); } catch (_e) {}
        }
        function readPersistedInternalThreadId() {
            try { return sessionStorage.getItem('kaya_internal_thread') || ''; } catch (_e) { return ''; }
        }
        function getNewChatSelectedIds() {
            return Array.from(internalNewChatSelected);
        }
        function updateInternalComposerState() {
            const el = document.getElementById('internalChatInput');
            const fileInput = document.getElementById('internalChatFile');
            const send = document.querySelector('#pageInternalChat .internal-chat-send-btn-sm');
            if (el && el.tagName === 'TEXTAREA') {
                el.style.height = 'auto';
                el.style.height = Math.min(Math.max(el.scrollHeight, 36), 120) + 'px';
            }
            const hasText = !!(el && String(el.value || '').trim());
            const hasFile = !!(fileInput && fileInput.files && fileInput.files[0]);
            if (send) send.classList.toggle('is-idle', !hasText && !hasFile);
        }
        function updateInternalFileChip() {
            const fi = document.getElementById('internalChatFile');
            const chip = document.getElementById('internalChatFileChip');
            const nameEl = document.getElementById('internalChatFileChipName');
            const has = !!(fi && fi.files && fi.files[0]);
            if (chip) {
                if (has) chip.removeAttribute('hidden');
                else chip.setAttribute('hidden', '');
            }
            if (nameEl) nameEl.textContent = has ? fi.files[0].name : '';
            const thumb = document.getElementById('internalChatFileChipThumb');
            if (thumb) {
                if (thumb._objectUrl) { try { URL.revokeObjectURL(thumb._objectUrl); } catch (_e) {} thumb._objectUrl = ''; }
                if (has && fi.files[0].type && fi.files[0].type.indexOf('image/') === 0) {
                    thumb._objectUrl = URL.createObjectURL(fi.files[0]);
                    thumb.src = thumb._objectUrl;
                    thumb.removeAttribute('hidden');
                } else {
                    thumb.removeAttribute('src');
                    thumb.setAttribute('hidden', '');
                }
            }
            updateInternalComposerState();
        }
        function updateInternalNewChatSelectionBar() {
            const wrap = document.getElementById('internalNewChatSelected');
            const btn = document.getElementById('btnInternalStartChat');
            const ids = getNewChatSelectedIds();
            if (wrap) {
                if (!ids.length) { wrap.setAttribute('hidden', ''); wrap.innerHTML = ''; }
                else {
                    wrap.removeAttribute('hidden');
                    wrap.innerHTML = ids.map(function(id) {
                        const u = (internalUsersCache || []).find(function(x) { return String(x.id) === String(id); });
                        const name = (u && (u.name || u.email)) || id;
                        return '<span class="internal-new-chat-chip">' + escapeHtml(name) + '<button type="button" class="internal-new-chat-chip-remove" data-user-id="' + escapeHtml(String(id)) + '" aria-label="remove">&times;</button></span>';
                    }).join('');
                }
            }
            if (btn) {
                const base = t('start_chat') || (LANG === 'fa' ? 'شروع چت' : 'Start chat');
                btn.textContent = ids.length ? (base + ' (' + ids.length + ')') : base;
                btn.disabled = ids.length === 0;
            }
        }
        function setInternalNewChatUserSelected(id, on) {
            id = String(id || '');
            if (!id) return;
            if (on) internalNewChatSelected.add(id);
            else internalNewChatSelected.delete(id);
            const row = document.querySelector('.internal-new-chat-user[value="' + id.replace(/"/g, '') + '"]');
            if (row) {
                row.checked = !!on;
                const wrap = row.closest('.internal-new-chat-user-row');
                if (wrap) wrap.classList.toggle('is-selected', !!on);
            }
            updateInternalNewChatSelectionBar();
        }
        function renderInternalNewChatUsers(users, query) {
            const list = document.getElementById('internalNewChatUserList');
            if (!list) return;
            const q = String(query || '').trim().toLowerCase();
            const filtered = (users || []).filter(function(u) {
                if (!q) return true;
                const hay = ((u.name || '') + ' ' + (u.email || '')).toLowerCase();
                return hay.indexOf(q) >= 0;
            });
            if (!filtered.length) {
                list.innerHTML = '<div class="empty">' + escapeHtml(t('no_users') || (LANG === 'fa' ? 'کاربری یافت نشد' : 'No users found')) + '</div>';
                updateInternalNewChatSelectionBar();
                return;
            }
            list.innerHTML = filtered.map(function(u) {
                const id = String(u.id);
                const name = u.name || u.email || id;
                const initial = (name && String(name).trim()[0]) ? String(name).trim()[0].toUpperCase() : '?';
                const pic = resolveAvatarUrl(u.avatar);
                const avatar = pic
                    ? '<span class="avatar-fallback">' + escapeHtml(initial) + '</span><img src="' + escapeHtml(pic) + '" alt="" onerror="this.style.display=\'none\'">'
                    : escapeHtml(initial);
                const online = u.status === 'online';
                const statusText = formatPresenceLabel(u);
                const checked = internalNewChatSelected.has(id) ? ' checked' : '';
                const selCls = internalNewChatSelected.has(id) ? ' is-selected' : '';
                return '<label class="internal-new-chat-user-row' + selCls + '"><input type="checkbox" class="internal-new-chat-user" value="' + escapeHtml(id) + '"' + checked + '><span class="internal-new-chat-user-avatar' + (online ? ' is-online' : '') + '">' + avatar + '</span><span class="internal-new-chat-user-meta"><span class="internal-new-chat-user-name">' + escapeHtml(name) + '</span><span class="internal-new-chat-user-status' + (online ? ' is-online' : '') + '">' + escapeHtml(statusText) + '</span></span></label>';
            }).join('');
            updateInternalNewChatSelectionBar();
        }
        function filterInternalNewChatUsers(q) {
            renderInternalNewChatUsers(internalUsersCache, q);
        }
        async function loadInternalUsers() {
            const res = await apiFetch('/api/internal/users');
            if (res.needLogin || !res.ok) return;
            const data = (res.data && res.data.data) || [];
            internalUsersCache = Array.isArray(data) ? data : [];
            const searchEl = document.getElementById('internalNewChatSearch');
            renderInternalNewChatUsers(internalUsersCache, searchEl ? searchEl.value : '');
        }
        function showNewChatForm() {
            const form = document.getElementById('internalNewChatForm');
            if (!form) return;
            internalNewChatSelected = new Set();
            form.style.display = 'flex';
            const searchEl = document.getElementById('internalNewChatSearch');
            if (searchEl) searchEl.value = '';
            const nameEl = document.getElementById('internalNewChatName');
            if (nameEl) nameEl.value = '';
            loadInternalUsers();
            updateInternalNewChatSelectionBar();
            setTimeout(function() { if (searchEl) searchEl.focus(); }, 50);
        }
        function hideNewChatForm() {
            const form = document.getElementById('internalNewChatForm');
            if (form) form.style.display = 'none';
        }
        function showInternalCallModal(statusText, showAccept) {
            const modal = document.getElementById('internalCallModal');
            const statusEl = document.getElementById('internalCallStatus');
            const connEl = document.getElementById('internalCallConnectionStatus');
            const acceptBtn = document.getElementById('internalCallAcceptBtn');
            const rejectBtn = document.getElementById('internalCallRejectBtn');
            const endBtn = document.getElementById('internalCallEndBtn');
            const addBtn = document.getElementById('internalCallAddBtn');
            const micBtn = document.getElementById('internalCallMicBtn');
            const cameraBtn = document.getElementById('internalCallCameraBtn');
            const localV = document.getElementById('internalCallLocalVideo');
            const container = document.getElementById('internalCallRemoteVideos');
            const videosWrap = document.getElementById('internalCallVideos');
            const voicePlaceholder = document.getElementById('internalCallVoicePlaceholder');
            const voiceAvatar = document.getElementById('internalCallVoiceAvatar');
            const voiceName = document.getElementById('internalCallVoiceName');
            const isVoice = internalCallType === 'voice';
            if (statusEl) statusEl.textContent = statusText || '';
            if (voicePlaceholder) voicePlaceholder.style.display = isVoice ? 'flex' : 'none';
            if (videosWrap) videosWrap.style.display = isVoice ? 'none' : 'block';
            /* Remote audio plays on #internalCallRemoteAudioSink — never display:none */
            if (isVoice) {
                const d = getInternalCallOtherDisplay();
                if (voiceAvatar) voiceAvatar.textContent = d.initial;
                if (voiceName) voiceName.textContent = d.name;
            }
            const isInCall = (statusText === t('in_call') || statusText === 'In call') && !showAccept;
            if (isInCall) startInternalCallDurationTimer();
            else stopInternalCallDurationTimer();
            if (connEl) { connEl.style.display = 'none'; connEl.textContent = ''; connEl.className = 'internal-call-connection-status'; }
            if (acceptBtn) acceptBtn.style.display = showAccept ? 'flex' : 'none';
            /* فقط یکی از دو دکمه قرمز: هنگام برقراری/در انتظار = «لغو»، بعد از اتصال = «قطع تماس» */
            if (rejectBtn) {
                rejectBtn.style.display = isInCall ? 'none' : 'flex';
                rejectBtn.textContent = showAccept ? t('reject_call') : (t('cancel_call') || t('reject_call'));
                rejectBtn.setAttribute('data-i18n', showAccept ? 'reject_call' : 'cancel_call');
            }
            if (endBtn) endBtn.style.display = isInCall ? 'flex' : 'none';
            if (addBtn) addBtn.style.display = 'none';
            if (micBtn) { micBtn.style.display = showAccept ? 'none' : 'flex'; micBtn.classList.toggle('muted', internalCallMicMuted); micBtn.title = internalCallMicMuted ? (t('call_unmute') || 'وصل میکروفون') : (t('call_mute') || 'قطع میکروفون'); }
            if (cameraBtn) { cameraBtn.style.display = (showAccept || internalCallType !== 'video') ? 'none' : 'flex'; cameraBtn.classList.toggle('off', internalCallCameraOff); cameraBtn.title = internalCallCameraOff ? (t('call_camera_on') || 'روشن کردن دوربین') : (t('call_camera_off') || 'خاموش کردن دوربین'); }
            if (localV) { localV.srcObject = null; localV.style.display = 'none'; }
            if (container) container.innerHTML = '';
            if (modal) modal.style.display = 'flex';
        }
        function hideInternalCallModal() {
            stopCallRingtone();
            stopInternalCallDurationTimer();
            const modal = document.getElementById('internalCallModal');
            if (modal) modal.style.display = 'none';
            if (internalCallLocalStream) { internalCallLocalStream.getTracks().forEach(function(t){ t.stop(); }); internalCallLocalStream = null; }
            const localV = document.getElementById('internalCallLocalVideo');
            if (localV) localV.srcObject = null;
            Object.keys(internalCallPeers).forEach(function(uid) { const pc = internalCallPeers[uid]; if (pc) pc.close(); });
            internalCallPeers = {};
            internalCallIceQueue = {};
            internalCallMarkedConnected = false;
            const container = document.getElementById('internalCallRemoteVideos');
            if (container) container.innerHTML = '';
            const audioSink = document.getElementById('internalCallRemoteAudioSink');
            if (audioSink) audioSink.innerHTML = '';
            internalCallPendingOffer = null;
            internalCallPendingInvite = null;
            internalCallIsIncoming = false;
            internalCallMicMuted = false;
            internalCallCameraOff = false;
            updateInternalCallConnectionStatus('', '');
        }
        function toggleInternalCallMic() {
            if (!internalCallLocalStream) return;
            const audioTracks = internalCallLocalStream.getAudioTracks();
            const currentlyEnabled = audioTracks.length > 0 && audioTracks[0].enabled;
            internalCallMicMuted = currentlyEnabled;
            if (audioTracks.length) audioTracks[0].enabled = !currentlyEnabled;
            const micBtn = document.getElementById('internalCallMicBtn');
            if (micBtn) { micBtn.classList.toggle('muted', internalCallMicMuted); micBtn.title = internalCallMicMuted ? (t('call_unmute') || 'وصل میکروفون') : (t('call_mute') || 'قطع میکروفون'); }
        }
        function toggleInternalCallCamera() {
            if (!internalCallLocalStream) return;
            const videoTracks = internalCallLocalStream.getVideoTracks();
            if (videoTracks.length) {
                internalCallCameraOff = videoTracks[0].enabled;
                videoTracks[0].enabled = !internalCallCameraOff;
            } else internalCallCameraOff = true;
            const localV = document.getElementById('internalCallLocalVideo');
            if (localV) localV.style.display = internalCallCameraOff ? 'none' : 'block';
            const cameraBtn = document.getElementById('internalCallCameraBtn');
            if (cameraBtn) { cameraBtn.classList.toggle('off', internalCallCameraOff); cameraBtn.title = internalCallCameraOff ? (t('call_camera_on') || 'روشن کردن دوربین') : (t('call_camera_off') || 'خاموش کردن دوربین'); }
        }
        async function startInternalCall(type) {
            const targets = getInternalCallTargets();
            if (!currentInternalThreadId || !targets.length) { toast(t('select_conversation_first'), true); return; }
            const s = getSocket();
            if (!s || !s.connected) { toast(t('user_offline') || 'کاربر آفلاین است', true); return; }
            try {
                internalCallType = type;
                internalCallMarkedConnected = false;
                internalCallLocalStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' });
                currentInternalThreadOtherUserId = targets[0];
                for (var i = 0; i < targets.length; i++) {
                    (function (toId) {
                        const pc = createCallPeerConnection(toId);
                        pc.createOffer().then(function(offer) {
                            return pc.setLocalDescription(offer).then(function() {
                                s.emit('call_offer', { toUserId: toId, threadId: currentInternalThreadId, type: type, sdp: offer });
                            });
                        }).catch(function(err) { console.warn('call offer failed', toId, err); });
                    })(peerKey(targets[i]));
                }
                showInternalCallModal(type === 'video' ? t('calling_video') : t('calling_voice'), false);
                const localV = document.getElementById('internalCallLocalVideo');
                if (localV) { localV.srcObject = internalCallLocalStream; localV.style.display = type === 'video' ? 'block' : 'none'; }
                const addBtn = document.getElementById('internalCallAddBtn');
                if (addBtn) addBtn.style.display = 'flex';
                const micBtn = document.getElementById('internalCallMicBtn');
                if (micBtn) { micBtn.style.display = 'flex'; micBtn.classList.toggle('muted', internalCallMicMuted); }
                const cameraBtn = document.getElementById('internalCallCameraBtn');
                if (cameraBtn) { cameraBtn.style.display = type === 'video' ? 'flex' : 'none'; cameraBtn.classList.toggle('off', internalCallCameraOff); }
            } catch (e) { toast(mediaErrorMessage(e), true); hideInternalCallModal(); }
        }
        async function acceptInternalCall() {
            if (!internalCallPendingOffer) return;
            const toUserId = peerKey(internalCallPendingOffer.fromUserId);
            const threadId = internalCallPendingOffer.threadId;
            const s = getSocket();
            if (!s || !s.connected) return;
            try {
                const type = internalCallPendingOffer.type || 'voice';
                internalCallType = type;
                internalCallMarkedConnected = false;
                internalCallLocalStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' });
                currentInternalThreadId = threadId;
                const pc = createCallPeerConnection(toUserId);
                await pc.setRemoteDescription(new RTCSessionDescription(internalCallPendingOffer.sdp));
                flushIceQueue(toUserId, pc);
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                s.emit('call_answer', { toUserId: toUserId, threadId: threadId, sdp: answer });
                currentInternalThreadOtherUserId = toUserId;
                showInternalCallModal(t('in_call'), false);
                const localV = document.getElementById('internalCallLocalVideo');
                if (localV) { localV.srcObject = internalCallLocalStream; localV.style.display = type === 'video' ? 'block' : 'none'; }
                const addBtn = document.getElementById('internalCallAddBtn');
                if (addBtn) addBtn.style.display = 'flex';
                const micBtn = document.getElementById('internalCallMicBtn');
                if (micBtn) { micBtn.style.display = 'flex'; micBtn.classList.toggle('muted', internalCallMicMuted); }
                const cameraBtn = document.getElementById('internalCallCameraBtn');
                if (cameraBtn) { cameraBtn.style.display = type === 'video' ? 'flex' : 'none'; cameraBtn.classList.toggle('off', internalCallCameraOff); }
                internalCallPendingOffer = null;
                internalCallIsIncoming = false;
                playCallConnected();
            } catch (e) { toast(mediaErrorMessage(e), true); rejectInternalCall(); }
        }
        function rejectInternalCall() {
            const s = getSocket();
            const toUserId = internalCallPendingOffer ? internalCallPendingOffer.fromUserId : currentInternalThreadOtherUserId;
            const threadId = internalCallPendingOffer ? internalCallPendingOffer.threadId : currentInternalThreadId;
            if (s && s.connected && toUserId && threadId) s.emit('call_reject', { toUserId: toUserId, threadId: threadId });
            hideInternalCallModal();
        }
        function endInternalCall() {
            const s = getSocket();
            if (s && s.connected && currentInternalThreadId) s.emit('call_end', { threadId: currentInternalThreadId });
            hideInternalCallModal();
        }
        async function handleCallOfferAsJoiner(data) {
            if (!data || !data.sdp) return;
            const fromUserId = peerKey(data.fromUserId);
            const threadId = data.threadId;
            const s = getSocket();
            if (!s || !internalCallLocalStream || !fromUserId) return;
            if (threadId != null && currentInternalThreadId && String(threadId) !== String(currentInternalThreadId)) return;
            if (internalCallPeers[fromUserId]) return;
            try {
                const pc = createCallPeerConnection(fromUserId);
                await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
                flushIceQueue(fromUserId, pc);
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                s.emit('call_answer', { toUserId: fromUserId, threadId: threadId || currentInternalThreadId, sdp: answer });
            } catch (err) { console.warn('handleCallOfferAsJoiner:', err); }
        }
        async function acceptInternalCallInvite() {
            if (!internalCallPendingInvite) return;
            const threadId = internalCallPendingInvite.threadId;
            const type = internalCallPendingInvite.type || 'voice';
            const s = getSocket();
            if (!s || !s.connected) return;
            try {
                document.getElementById('internalCallInviteModal').style.display = 'none';
                currentInternalThreadId = threadId;
                currentInternalThreadOtherUserId = internalCallPendingInvite.fromUserId;
                internalCallType = type;
                internalCallIsJoining = true;
                internalCallMarkedConnected = false;
                internalCallLocalStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' });
                s.emit('call_invite_accept', { threadId: threadId, type: type });
                showInternalCallModal(t('in_call'), false);
                const localV = document.getElementById('internalCallLocalVideo');
                if (localV) { localV.srcObject = internalCallLocalStream; localV.style.display = type === 'video' ? 'block' : 'none'; }
                const addBtn = document.getElementById('internalCallAddBtn');
                if (addBtn) addBtn.style.display = 'flex';
                const micBtn = document.getElementById('internalCallMicBtn');
                if (micBtn) { micBtn.style.display = 'flex'; micBtn.classList.toggle('muted', internalCallMicMuted); }
                const cameraBtn = document.getElementById('internalCallCameraBtn');
                if (cameraBtn) { cameraBtn.style.display = type === 'video' ? 'flex' : 'none'; cameraBtn.classList.toggle('off', internalCallCameraOff); }
                internalCallPendingInvite = null;
                playCallConnected();
                setTimeout(function() { internalCallIsJoining = false; }, 5000);
            } catch (e) { toast(mediaErrorMessage(e), true); rejectInternalCallInvite(); }
        }
        function rejectInternalCallInvite() {
            stopCallRingtone();
            const s = getSocket();
            if (internalCallPendingInvite && s && s.connected) s.emit('call_invite_reject', { fromUserId: internalCallPendingInvite.fromUserId, threadId: internalCallPendingInvite.threadId });
            internalCallPendingInvite = null;
            const mod = document.getElementById('internalCallInviteModal');
            if (mod) mod.style.display = 'none';
        }
        let addToCallParticipantsCache = [];
        function renderAddToCallList(participants) {
            const list = document.getElementById('addToCallList');
            if (!list) return;
            addToCallParticipantsCache = participants || addToCallParticipantsCache;
            const search = (document.getElementById('addToCallSearch') && document.getElementById('addToCallSearch').value) || '';
            const q = search.trim().toLowerCase();
            const filtered = q ? addToCallParticipantsCache.filter(function(p) {
                const name = (p.name || p.email || '').toLowerCase();
                return name.indexOf(q) >= 0;
            }) : addToCallParticipantsCache;
            list.innerHTML = filtered.map(function(p) {
                const name = p.name || p.email || p.id;
                const initial = (name && name.toString().trim()[0]) ? name.toString().trim()[0].toUpperCase() : '?';
                return '<label class="add-to-call-item" data-user-id="' + escapeHtml(p.id) + '"><input type="checkbox" class="add-to-call-check" data-user-id="' + escapeHtml(p.id) + '"><span class="add-to-call-avatar">' + escapeHtml(initial) + '</span><span class="add-to-call-name">' + escapeHtml(name) + '</span></label>';
            }).join('');
            const selAll = document.getElementById('addToCallSelectAll');
            if (selAll) selAll.checked = false;
        }
        function filterAddToCallList() {
            renderAddToCallList(addToCallParticipantsCache);
        }
        function toggleAddToCallSelectAll(checked) {
            const list = document.getElementById('addToCallList');
            if (!list) return;
            list.querySelectorAll('.add-to-call-check').forEach(function(cb) {
                if (cb.closest('.add-to-call-item').style.display !== 'none') cb.checked = !!checked;
            });
        }
        function showAddToCallModal() {
            const list = document.getElementById('addToCallList');
            if (!list) return;
            const inCallIds = Object.keys(internalCallPeers);
            const participants = currentInternalThreadParticipants.filter(function(p) {
                const id = String(p.id);
                return id !== String(currentUser && currentUser.id) && inCallIds.indexOf(id) < 0;
            });
            if (participants.length === 0) { toast(LANG === 'fa' ? 'همه در تماس هستند' : 'Everyone is already in the call', true); return; }
            const searchEl = document.getElementById('addToCallSearch');
            if (searchEl) searchEl.value = '';
            const selAll = document.getElementById('addToCallSelectAll');
            if (selAll) selAll.checked = false;
            renderAddToCallList(participants);
            document.getElementById('addToCallModal').style.display = 'flex';
        }
        function closeAddToCallModal() {
            const mod = document.getElementById('addToCallModal');
            if (mod) mod.style.display = 'none';
        }
        function inviteSelectedToCall() {
            const list = document.getElementById('addToCallList');
            if (!list) return;
            const checked = list.querySelectorAll('.add-to-call-check:checked');
            const ids = Array.from(checked).map(function(cb) { return cb.getAttribute('data-user-id'); }).filter(Boolean);
            if (ids.length === 0) { toast(LANG === 'fa' ? 'حداقل یک نفر را انتخاب کنید' : 'Select at least one person', true); return; }
            const s = getSocket();
            if (!s || !s.connected || !currentInternalThreadId) { toast(t('user_offline') || (LANG === 'fa' ? 'اتصال برقرار نیست' : 'Not connected'), true); return; }
            ids.forEach(function(userId) {
                s.emit('call_invite', { toUserId: userId, threadId: currentInternalThreadId });
            });
            closeAddToCallModal();
            toast(ids.length === 1 ? (LANG === 'fa' ? 'دعوت ارسال شد' : 'Invite sent') : (LANG === 'fa' ? 'دعوت به ' + ids.length + ' نفر ارسال شد' : 'Invite sent to ' + ids.length + ' people'));
        }
        function inviteToCall(userId) {
            const s = getSocket();
            if (!s || !s.connected || !currentInternalThreadId) return;
            s.emit('call_invite', { toUserId: userId, threadId: currentInternalThreadId });
            toast((LANG === 'fa' ? 'دعوت ارسال شد' : 'Invite sent'));
        }
        async function startInternalChat() {
            const userIds = getNewChatSelectedIds();
            if (!userIds.length) { toast(t('select_user_first'), true); return; }
            const nameEl = document.getElementById('internalNewChatName');
            const groupName = nameEl ? String(nameEl.value || '').trim() : '';
            const body = { userIds: userIds };
            if (groupName || userIds.length > 1) {
                body.type = 'group';
                if (groupName) body.name = groupName;
            }
            const btn = document.getElementById('btnInternalStartChat');
            if (btn) btn.disabled = true;
            try {
                const res = await apiFetch('/api/internal/threads', { method: 'POST', body: JSON.stringify(body) });
                if (res.needLogin) return;
                if (res.ok) {
                    hideNewChatForm();
                    if (nameEl) nameEl.value = '';
                    const thread = (res.data && res.data.id) ? res.data : (res.data && res.data.data);
                    const tid = thread && thread.id;
                    if (tid) {
                        if (thread && thread.participants) {
                            const exists = (internalThreadsCache || []).some(function(x) { return sameInternalId(x.id, tid); });
                            if (!exists) internalThreadsCache = [thread].concat(internalThreadsCache || []);
                        }
                        openInternalThread(tid);
                    }
                    loadInternalThreads();
                } else { toast((res.data && res.data.error) || t('err_generic'), true); }
            } finally {
                if (btn) btn.disabled = false;
            }
        }
        function backToInternalChatList() {
            const wrap = document.getElementById('internalChatLayoutWrap');
            if (wrap) { wrap.classList.remove('internal-chat-mobile-chat-open', 'internal-chat-has-chat'); }
            currentInternalThreadId = null;
            currentInternalThreadOtherUserId = null;
            currentInternalThreadParticipants = [];
            try { sessionStorage.removeItem('kaya_internal_thread'); } catch (_e) {}
            refreshInternalThreadList();
        }
        function isInternalChatMobile() { return window.matchMedia('(max-width: 768px)').matches; }
        async function openInternalThread(threadId) {
            if (!threadId) return;
            currentInternalThreadId = threadId;
            persistInternalThreadId(threadId);
            currentInternalThreadOtherUserId = null;
            const wrap = document.getElementById('internalChatLayoutWrap');
            if (wrap) { wrap.classList.add('internal-chat-has-chat'); if (isInternalChatMobile()) wrap.classList.add('internal-chat-mobile-chat-open'); }
            let thread = (internalThreadsCache || []).find(function(x) { return sameInternalId(x.id, threadId); });
            if (!thread) {
                const partRes = await apiFetch('/api/internal/threads');
                if (partRes.ok && partRes.data && partRes.data.data) {
                    internalThreadsCache = partRes.data.data;
                    thread = internalThreadsCache.find(function(x) { return sameInternalId(x.id, threadId); });
                }
            }
            const headerEl = document.getElementById('internalChatHeader');
            if (headerEl) headerEl.textContent = threadDisplayName(thread);
            const others = thread && thread.participants ? thread.participants.filter(function(p) { return !sameInternalId(p.id, currentUser && currentUser.id); }) : [];
            currentInternalThreadOtherUserId = others.length ? others[0].id : null;
            currentInternalThreadParticipants = others;
            updateInternalChatHeaderPresence(thread);
            const headerAvatarEl = document.getElementById('internalChatHeaderAvatar');
            if (headerAvatarEl) {
                if (thread && thread.isGroup) {
                    headerAvatarEl.innerHTML = '<span class="avatar-fallback">👥</span>';
                } else {
                    const other = others[0];
                    const initial = (other && (other.name || other.email || '').trim()[0]) ? (other.name || other.email || '').trim()[0].toUpperCase() : '\u003F';
                    const pic = resolveAvatarUrl(other && other.avatar);
                    if (pic) headerAvatarEl.innerHTML = '<span class="avatar-fallback">' + escapeHtml(initial) + '</span><img src="' + escapeHtml(pic) + '" alt="" onerror="this.style.display=\'none\'">';
                    else { headerAvatarEl.innerHTML = ''; headerAvatarEl.textContent = initial; }
                }
            }
            const callBtns = document.getElementById('internalChatCallBtns');
            if (callBtns) callBtns.style.display = thread ? 'flex' : 'none';
            callBtns && callBtns.querySelectorAll('[data-call-type]').forEach(function(btn) {
                btn.style.display = others.length ? '' : 'none';
            });
            var unreadHint = 0;
            (internalThreadsCache || []).forEach(function(th) {
                if (sameInternalId(th.id, threadId)) {
                    unreadHint = th.unreadCount || 0;
                    th.unreadCount = 0;
                }
            });
            refreshInternalThreadList();
            apiFetch('/api/internal/threads/' + threadId + '/read', { method: 'POST' }).catch(function(){});
            loadInternalMessages(threadId, unreadHint);
            setTimeout(function() {
                const inp = document.getElementById('internalChatInput');
                if (inp && !isInternalChatMobile()) inp.focus();
            }, 40);
        }
        function closeInternalThreadManageModal() {
            const modal = document.getElementById('internalThreadManageModal');
            if (modal) modal.style.display = 'none';
        }
        async function showInternalThreadManageModal() {
            if (!currentInternalThreadId) { toast(t('select_conversation_first'), true); return; }
            const thread = (internalThreadsCache || []).find(function(x) { return sameInternalId(x.id, currentInternalThreadId); });
            const modal = document.getElementById('internalThreadManageModal');
            if (!modal) return;
            const renameWrap = document.getElementById('internalThreadRenameGroup');
            const renameInput = document.getElementById('internalThreadRenameInput');
            if (renameWrap) renameWrap.style.display = 'block';
            if (renameInput) renameInput.value = (thread && thread.name) || '';
            renderInternalThreadMembers(thread);
            await loadInternalThreadAddMembersSelect(thread);
            modal.style.display = 'flex';
        }
        function renderInternalThreadMembers(thread) {
            const list = document.getElementById('internalThreadMembersList');
            if (!list) return;
            const me = currentUser || {};
            const others = (thread && thread.participants) || currentInternalThreadParticipants || [];
            const isCreator = thread && String(thread.createdById) === String(me.id);
            const rows = [{ id: me.id, name: (me.name || me.email || '') + ' (' + (t('you') || (LANG === 'fa' ? 'شما' : 'You')) + ')', status: me.status || 'online', avatar: me.avatar, isMe: true }]
                .concat(others.map(function(p) { return { id: p.id, name: p.name || p.email || '', status: p.status, avatar: p.avatar, lastSeenAt: p.lastSeenAt, isMe: false }; }));
            list.innerHTML = rows.map(function(p) {
                const canRemove = !p.isMe && isCreator;
                const removeBtn = canRemove
                    ? '<button type="button" class="btn-secondary btn-sm internal-thread-remove-member" data-user-id="' + escapeHtml(String(p.id)) + '">' + escapeHtml(t('remove') || (LANG === 'fa' ? 'حذف' : 'Remove')) + '</button>'
                    : '';
                const initial = (p.name && String(p.name).trim()[0]) ? String(p.name).trim()[0].toUpperCase() : '?';
                const pic = resolveAvatarUrl(p.avatar);
                const avatar = pic
                    ? '<span class="avatar-fallback">' + escapeHtml(initial) + '</span><img src="' + escapeHtml(pic) + '" alt="" onerror="this.style.display=\'none\'">'
                    : escapeHtml(initial);
                const online = p.status === 'online';
                return '<div class="internal-thread-member-row"><span class="internal-thread-member-avatar' + (online ? ' is-online' : '') + '">' + avatar + '</span><span class="internal-thread-member-name">' + escapeHtml(p.name || '') + '</span><span class="internal-thread-member-status' + (online ? ' is-online' : '') + '">' + escapeHtml(formatPresenceLabel(p)) + '</span>' + removeBtn + '</div>';
            }).join('');
        }
        let internalThreadAddSelected = new Set();
        let internalThreadAddUsersCache = [];
        function setInternalThreadAddUserSelected(id, on) {
            id = String(id || '');
            if (!id) return;
            if (on) internalThreadAddSelected.add(id);
            else internalThreadAddSelected.delete(id);
            const row = document.querySelector('.internal-thread-add-user[value="' + id.replace(/"/g, '') + '"]');
            if (row) {
                row.checked = !!on;
                const wrap = row.closest('.internal-new-chat-user-row');
                if (wrap) wrap.classList.toggle('is-selected', !!on);
            }
            const btn = document.getElementById('btnInternalAddMembers');
            if (btn) btn.disabled = internalThreadAddSelected.size === 0;
        }
        function renderInternalThreadAddList(users, query) {
            const list = document.getElementById('internalThreadAddList');
            if (!list) return;
            const q = String(query || '').trim().toLowerCase();
            const filtered = (users || []).filter(function(u) {
                if (!q) return true;
                return ((u.name || '') + ' ' + (u.email || '')).toLowerCase().indexOf(q) >= 0;
            });
            if (!filtered.length) {
                list.innerHTML = '<div class="empty">' + escapeHtml(t('no_users') || (LANG === 'fa' ? 'کاربری برای افزودن نیست' : 'No users to add')) + '</div>';
                return;
            }
            list.innerHTML = filtered.map(function(u) {
                const id = String(u.id);
                const name = u.name || u.email || id;
                const initial = (name && String(name).trim()[0]) ? String(name).trim()[0].toUpperCase() : '?';
                const pic = resolveAvatarUrl(u.avatar);
                const avatar = pic
                    ? '<span class="avatar-fallback">' + escapeHtml(initial) + '</span><img src="' + escapeHtml(pic) + '" alt="" onerror="this.style.display=\'none\'">'
                    : escapeHtml(initial);
                const online = u.status === 'online';
                const checked = internalThreadAddSelected.has(id) ? ' checked' : '';
                const selCls = internalThreadAddSelected.has(id) ? ' is-selected' : '';
                return '<label class="internal-new-chat-user-row' + selCls + '"><input type="checkbox" class="internal-thread-add-user" value="' + escapeHtml(id) + '"' + checked + '><span class="internal-new-chat-user-avatar' + (online ? ' is-online' : '') + '">' + avatar + '</span><span class="internal-new-chat-user-meta"><span class="internal-new-chat-user-name">' + escapeHtml(name) + '</span><span class="internal-new-chat-user-status' + (online ? ' is-online' : '') + '">' + escapeHtml(formatPresenceLabel(u)) + '</span></span></label>';
            }).join('');
        }
        function filterInternalThreadAddMembers(q) {
            renderInternalThreadAddList(internalThreadAddUsersCache, q);
        }
        async function loadInternalThreadAddMembersSelect(thread) {
            internalThreadAddSelected = new Set();
            const searchEl = document.getElementById('internalThreadAddSearch');
            if (searchEl) searchEl.value = '';
            const btn = document.getElementById('btnInternalAddMembers');
            if (btn) btn.disabled = true;
            const existing = new Set(((thread && thread.participants) || []).map(function(p) { return String(p.id); }));
            if (currentUser && currentUser.id) existing.add(String(currentUser.id));
            const res = await apiFetch('/api/internal/users');
            if (!res.ok) { internalThreadAddUsersCache = []; renderInternalThreadAddList([]); return; }
            const users = (res.data && res.data.data) || res.data || [];
            internalThreadAddUsersCache = (Array.isArray(users) ? users : []).filter(function(u) { return !existing.has(String(u.id)); });
            const wrap = document.getElementById('internalThreadAddMembersWrap');
            if (wrap) wrap.style.display = internalThreadAddUsersCache.length ? '' : 'none';
            renderInternalThreadAddList(internalThreadAddUsersCache, '');
        }
        async function renameInternalThread() {
            if (!currentInternalThreadId) return;
            const input = document.getElementById('internalThreadRenameInput');
            const name = input ? String(input.value || '').trim() : '';
            if (!name) { toast(t('group_name_required') || (LANG === 'fa' ? 'نام گروه را وارد کنید' : 'Enter a group name'), true); return; }
            const res = await apiFetch('/api/internal/threads/' + currentInternalThreadId, { method: 'PATCH', body: JSON.stringify({ name: name }) });
            if (res.needLogin) return;
            if (!res.ok) { toast((res.data && res.data.error) || t('err_generic'), true); return; }
            toast(t('saved') || (LANG === 'fa' ? 'ذخیره شد' : 'Saved'));
            await loadInternalThreads();
            openInternalThread(currentInternalThreadId);
            showInternalThreadManageModal();
        }
        async function addInternalThreadMembers() {
            if (!currentInternalThreadId) return;
            const userIds = Array.from(internalThreadAddSelected);
            if (!userIds.length) { toast(t('select_user_first'), true); return; }
            const res = await apiFetch('/api/internal/threads/' + currentInternalThreadId + '/participants', {
                method: 'POST',
                body: JSON.stringify({ userIds: userIds })
            });
            if (res.needLogin) return;
            if (!res.ok) { toast((res.data && res.data.error) || t('err_generic'), true); return; }
            toast(t('members_added') || (LANG === 'fa' ? 'اعضا اضافه شدند' : 'Members added'));
            await loadInternalThreads();
            openInternalThread(currentInternalThreadId);
            showInternalThreadManageModal();
        }
        async function removeInternalThreadMember(userId) {
            if (!currentInternalThreadId || !userId) return;
            if (!confirm(t('confirm_remove_member') || (LANG === 'fa' ? 'این عضو از گروه حذف شود؟' : 'Remove this member from the group?'))) return;
            const res = await apiFetch('/api/internal/threads/' + currentInternalThreadId + '/participants/' + userId, { method: 'DELETE' });
            if (res.needLogin) return;
            if (!res.ok) { toast((res.data && res.data.error) || t('err_generic'), true); return; }
            toast(t('member_removed') || (LANG === 'fa' ? 'عضو حذف شد' : 'Member removed'));
            await loadInternalThreads();
            openInternalThread(currentInternalThreadId);
            showInternalThreadManageModal();
        }
        async function leaveInternalThread() {
            if (!currentInternalThreadId || !currentUser || !currentUser.id) return;
            if (!confirm(t('confirm_leave_chat') || (LANG === 'fa' ? 'از این گفتگو خارج می‌شوید؟' : 'Leave this conversation?'))) return;
            const res = await apiFetch('/api/internal/threads/' + currentInternalThreadId + '/participants/' + currentUser.id, { method: 'DELETE' });
            if (res.needLogin) return;
            if (!res.ok) { toast((res.data && res.data.error) || t('err_generic'), true); return; }
            closeInternalThreadManageModal();
            currentInternalThreadId = null;
            backToInternalChatList();
            loadInternalThreads();
            toast(t('left_chat') || (LANG === 'fa' ? 'از گفتگو خارج شدید' : 'You left the chat'));
        }
        function insertInternalChatQuickReply(text) {
            const inp = document.getElementById('internalChatInput');
            if (inp) { inp.value = (inp.value ? inp.value + ' ' : '') + text; inp.focus(); if (typeof updateInternalComposerState === 'function') updateInternalComposerState(); }
        }
        async function loadInternalMessages(threadId, unreadHint) {
            const list = document.getElementById('internalChatMessages');
            if (!list) return;
            bindInternalChatScroll();
            internalChatStickBottom = true;
            list.innerHTML = '<div class="loading-skeleton loading-row"></div>';
            const res = await apiFetch('/api/internal/threads/' + threadId + '/messages');
            if (res.needLogin) return;
            if (!res.ok) { list.innerHTML = '<div class="empty">' + t('loading_err') + '</div>'; return; }
            const data = (res.data && res.data.data) || [];
            const me = (currentUser && currentUser.id) || '';
            const quickEl = document.getElementById('internalChatQuickReplies');
            if (quickEl) {
                if (data.length === 0) {
                    quickEl.style.display = 'flex';
                    const chips = [{ key: 'quick_reply_hi', text: LANG === 'fa' ? 'سلام' : 'Hi' }, { key: 'quick_reply_gotit', text: LANG === 'fa' ? 'متوجه شدم' : 'Got it' }, { key: 'quick_reply_later', text: LANG === 'fa' ? 'بعداً پاسخ می‌دهم' : 'Will reply later' }, { key: 'quick_reply_checking', text: LANG === 'fa' ? 'در حال بررسی' : 'Checking' }];
                    quickEl.innerHTML = chips.map(function(c) { return '<button type="button" class="internal-quick-reply-chip" data-reply="' + String(c.text).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '">' + t(c.key) + '</button>'; }).join('');
                    quickEl.querySelectorAll('.internal-quick-reply-chip').forEach(function(btn) { btn.onclick = function() { insertInternalChatQuickReply(this.getAttribute('data-reply') || ''); }; });
                } else { quickEl.style.display = 'none'; quickEl.innerHTML = ''; }
            }
            var html = '';
            if (data.length === 0) {
                html = '<div class="empty internal-chat-empty-state">' + internalChatEmptyVisualHtml() + '<p>' + t('start_chat_hint') + '</p></div>';
            } else {
                var unreadLeft = unreadHint || 0;
                var unreadStartIdx = -1;
                if (unreadLeft > 0) {
                    for (var i = data.length - 1; i >= 0; i--) {
                        if (String(data[i].fromUserId) !== String(me)) {
                            unreadLeft--;
                            unreadStartIdx = i;
                            if (unreadLeft <= 0) break;
                        }
                    }
                }
                var prevFrom = '';
                var prevDay = '';
                data.forEach(function(m, idx) {
                    if (idx === unreadStartIdx) {
                        html += '<div class="internal-chat-unread-sep"><span>' + escapeHtml(t('internal_unread_sep') || (LANG === 'fa' ? 'پیام‌های خوانده‌نشده' : 'Unread messages')) + '</span></div>';
                        prevFrom = '';
                    }
                    var day = internalDayKey(m.createdAt);
                    if (day && day !== prevDay) {
                        html += '<div class="internal-chat-day-sep"><span>' + escapeHtml(formatInternalDayLabel(m.createdAt)) + '</span></div>';
                        prevDay = day;
                        prevFrom = '';
                    }
                    html += buildInternalMessageHtml(m, me, !!(prevFrom && String(prevFrom) === String(m.fromUserId)));
                    prevFrom = m.fromUserId;
                });
            }
            list.innerHTML = html;
            scrollInternalChatToBottom(true);
            if (typeof updateInternalComposerState === 'function') updateInternalComposerState();
        }
        function appendTicketReply(r) {
            const list = document.getElementById('ticketReplies');
            if (!list || !currentTicketId) return;
            const noReply = list.querySelector('.text-muted');
            if (noReply) noReply.remove();
            const isOut = String(r.userId) === String(currentUser && currentUser.id);
            const att = (r.attachments && r.attachments.length) ? r.attachments.map(function(a) { return '<a href="' + escapeHtml(a.url) + '" target="_blank" rel="noopener" style="color:var(--accent); margin-left:8px;">📎 ' + escapeHtml(a.name || t('file')) + '</a>'; }).join('') : '';
            const html = '<div class="msg ' + (isOut ? 'out' : 'in') + '" style="margin:8px 0;"><div>' + linkifyMessageContent(r.content || '') + '</div>' + att + '<div class="time">' + userDisplayHtml(r.user) + ' · ' + (r.createdAt ? fmtTZ(r.createdAt, 'datetime') : '') + '</div></div>';
            list.insertAdjacentHTML('beforeend', html);
            list.scrollTop = list.scrollHeight;
        }
        async function sendInternalMessage() {
            if (!currentInternalThreadId) { toast(t('select_conversation_first'), true); return; }
            const inputEl = document.getElementById('internalChatInput');
            const content = (inputEl && inputEl.value) || '';
            const fileInput = document.getElementById('internalChatFile');
            const allowDownload = !(document.getElementById('internalChatAllowDownload') && !document.getElementById('internalChatAllowDownload').checked);
            const attachments = [];
            if (fileInput && fileInput.files && fileInput.files[0]) {
                try {
                    const formData = new FormData();
                    formData.append('file', fileInput.files[0]);
                    const up = await fetch(API + '/api/upload', { method: 'POST', credentials: 'include', body: formData });
                    const upData = await up.json();
                    if (!up.ok || !upData.url) { toast((upData && upData.error) || t('err_generic'), true); return; }
                    attachments.push({ url: upData.url, name: upData.name || t('file'), size: upData.size, allowDownload: allowDownload });
                } catch (_e) {
                    toast(t('err_generic'), true);
                    return;
                }
            }
            if (!content.trim() && attachments.length === 0) { toast(t('enter_text_or_file'), true); return; }
            const res = await apiFetch('/api/internal/threads/' + currentInternalThreadId + '/messages', { method: 'POST', body: JSON.stringify({ content: content.trim() || '(پیوست)', attachments: attachments }) });
            if (res.needLogin) return;
            if (res.ok) {
                if (inputEl) { inputEl.value = ''; updateInternalComposerState(); }
                if (fileInput) { fileInput.value = ''; if (typeof toggleInternalFileOption === 'function') toggleInternalFileOption(); }
                const msg = res.data;
                if (msg) { msg.fromUserId = msg.fromUserId || (msg.fromUser && msg.fromUser.id); appendInternalMessage(msg); }
                loadInternalThreads();
            } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }
        function showInternalChatPopup(threadId, fromName) {
            currentInternalThreadId = threadId;
            const popup = document.getElementById('internalChatPopup');
            const titleEl = document.getElementById('internalChatPopupTitle');
            const listEl = document.getElementById('internalChatPopupThreadList');
            const messagesEl = document.getElementById('internalChatPopupMessages');
            const quickEl = document.getElementById('internalChatPopupQuickReplies');
            const sendWrap = document.querySelector('.internal-chat-popup-send');
            if (titleEl) titleEl.textContent = (LANG === 'fa' ? 'پیام از ' : 'Message from ') + (fromName || '');
            if (listEl) listEl.style.display = 'none';
            if (messagesEl) messagesEl.style.display = 'flex';
            if (sendWrap) sendWrap.style.display = 'flex';
            if (popup) popup.style.display = 'flex';
            const btn = document.getElementById('internalChatFloatingBtn');
            if (btn) btn.classList.add('internal-chat-floating-btn-open');
            loadInternalMessagesForPopup(threadId);
        }
        function closeInternalChatPopup() {
            const popup = document.getElementById('internalChatPopup');
            if (popup) { popup.style.display = 'none'; popup.classList.remove('minimized'); }
            const btn = document.getElementById('internalChatFloatingBtn');
            if (btn) btn.classList.remove('internal-chat-floating-btn-open');
            const onInternalPage = document.querySelector('.nav-link.active');
            if (!onInternalPage || onInternalPage.getAttribute('data-page') !== 'internal-chat') {
                currentInternalThreadId = null;
            }
        }
        function toggleInternalChatPopupMinimize() {
            const popup = document.getElementById('internalChatPopup');
            if (!popup) return;
            popup.classList.toggle('minimized');
            const btn = popup.querySelector('.internal-chat-popup-minimize');
            if (btn) {
                btn.title = popup.classList.contains('minimized') ? (LANG === 'fa' ? 'باز کردن' : 'Expand') : (LANG === 'fa' ? 'کوچک‌سازی' : 'Minimize');
                const svg = btn.querySelector('svg');
                if (svg) svg.innerHTML = popup.classList.contains('minimized') ? '<path d="M19 12H5M12 19l-7-7 7-7"/>' : '<path d="M5 12h14"/>';
            }
        }
        function handlePopupChatKeydown(e) {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendInternalMessageFromPopup(); }
        }
        function insertPopupQuickReply(text) {
            const inp = document.getElementById('internalChatPopupInput');
            if (inp) { inp.value = (inp.value ? inp.value + ' ' : '') + text; inp.focus(); }
        }
        function openInternalChatFromPopup() {
            const tid = currentInternalThreadId;
            closeInternalChatPopup();
            showPage('internal-chat');
            setTimeout(function() { openInternalThread(tid); loadInternalThreads(); loadInternalUsers(); }, 100);
        }
        function appendInternalMessageToPopup(m) {
            const list = document.getElementById('internalChatPopupMessages');
            if (!list || !currentInternalThreadId) return;
            const emptyEl = list.querySelector('.empty');
            if (emptyEl) emptyEl.remove();
            const quickEl = document.getElementById('internalChatPopupQuickReplies');
            if (quickEl) { quickEl.style.display = 'none'; quickEl.innerHTML = ''; }
            const me = (currentUser && currentUser.id) || '';
            const html = buildInternalMessageHtml(m, me);
            list.insertAdjacentHTML('beforeend', html);
            list.scrollTop = list.scrollHeight;
        }
        async function loadInternalMessagesForPopup(threadId) {
            const list = document.getElementById('internalChatPopupMessages');
            if (!list) return;
            list.innerHTML = '<div class="loading-skeleton loading-row"></div>';
            const res = await apiFetch('/api/internal/threads/' + threadId + '/messages');
            if (res.needLogin) return;
            if (!res.ok) { list.innerHTML = '<div class="empty">' + t('loading_err') + '</div>'; return; }
            const data = (res.data && res.data.data) || [];
            const me = (currentUser && currentUser.id) || '';
            const quickEl = document.getElementById('internalChatPopupQuickReplies');
            if (quickEl) {
                if (data.length === 0) {
                    quickEl.style.display = 'flex';
                    const chips = [{ key: 'quick_reply_hi', text: LANG === 'fa' ? 'سلام' : 'Hi' }, { key: 'quick_reply_gotit', text: LANG === 'fa' ? 'متوجه شدم' : 'Got it' }, { key: 'quick_reply_later', text: LANG === 'fa' ? 'بعداً پاسخ می‌دهم' : 'Will reply later' }, { key: 'quick_reply_checking', text: LANG === 'fa' ? 'در حال بررسی' : 'Checking' }];
                    quickEl.innerHTML = chips.map(function(c) { const s = String(c.text).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); return '<button type="button" class="internal-quick-reply-chip" data-reply="' + s + '">' + t(c.key) + '</button>'; }).join('');
                    quickEl.querySelectorAll('.internal-quick-reply-chip').forEach(function(btn) { btn.onclick = function() { insertPopupQuickReply(this.getAttribute('data-reply') || ''); }; });
                } else { quickEl.style.display = 'none'; quickEl.innerHTML = ''; }
            }
            list.innerHTML = data.length === 0 ? '<div class="empty internal-chat-empty-state"><span class="empty-icon">💬</span><p>' + t('start_chat_hint') + '</p></div>' : data.map(function(m) {
                return buildInternalMessageHtml(m, me);
            }).join('');
            list.scrollTop = list.scrollHeight;
        }
        async function sendInternalMessageFromPopup() {
            if (!currentInternalThreadId) return;
            const inp = document.getElementById('internalChatPopupInput');
            const fileInput = document.getElementById('internalChatPopupFile');
            const content = (inp && inp.value) ? inp.value.trim() : '';
            const attachments = [];
            if (fileInput && fileInput.files && fileInput.files[0]) {
                const formData = new FormData();
                formData.append('file', fileInput.files[0]);
                const up = await fetch(API + '/api/upload', { method: 'POST', credentials: 'include', body: formData });
                const upData = await up.json();
                if (upData.url) attachments.push({ url: upData.url, name: upData.name || t('file'), size: upData.size, allowDownload: true });
            }
            if (!content && attachments.length === 0) { toast(t('enter_text_or_file'), true); return; }
            const res = await apiFetch('/api/internal/threads/' + currentInternalThreadId + '/messages', { method: 'POST', body: JSON.stringify({ content: content || '(پیوست)', attachments: attachments }) });
            if (res.needLogin) return;
            if (res.ok) {
                if (inp) inp.value = '';
                if (fileInput) fileInput.value = '';
                const fileLabel = document.getElementById('internalChatPopupFileLabel');
                if (fileLabel) { fileLabel.textContent = ''; fileLabel.style.display = 'none'; }
                const msg = res.data;
                if (msg) { msg.fromUserId = msg.fromUserId || (msg.fromUser && msg.fromUser.id); appendInternalMessageToPopup(msg); }
                loadInternalThreads();
            } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }

        var qrRefreshInterval = null;
        let qrRetryTimeout = null;
        let isWhatsappPolling = false;
        const WHATSAPP_POLL_MS = 4000;
        const WHATSAPP_QR_RETRY_MS = 1800;
        let _whatsappStatusSeq = 0;
        let _whatsappActiveTab = 'channels';
        let _whatsappRefreshBusyUntil = 0;

        function initWhatsappProTabs() {
            var nav = document.querySelector('.whatsapp-pro-nav');
            if (!nav || nav._waProBound) return;
            nav._waProBound = true;
            nav.addEventListener('click', function (e) {
                var tab = e.target.closest('.whatsapp-pro-tab');
                if (!tab) return;
                e.preventDefault();
                switchWhatsappMainTab(tab.getAttribute('data-wa-tab') || 'channels');
            });
        }
        function switchWhatsappMainTab(name, silent) {
            name = (name === 'automation' || name === 'routing') ? name : 'channels';
            _whatsappActiveTab = name;
            document.querySelectorAll('.whatsapp-pro-tab').forEach(function (b) {
                var on = (b.getAttribute('data-wa-tab') || '') === name;
                b.classList.toggle('active', on);
                b.setAttribute('aria-selected', on ? 'true' : 'false');
            });
            var map = { channels: 'whatsappPanelChannels', automation: 'whatsappPanelAutomation', routing: 'whatsappPanelRouting' };
            Object.keys(map).forEach(function (key) {
                var el = document.getElementById(map[key]);
                if (!el) return;
                var act = key === name;
                el.classList.toggle('whatsapp-pro-panel--active', act);
                el.setAttribute('aria-hidden', act ? 'false' : 'true');
            });
            if (name === 'routing') {
                loadWhatsappDeptRouting();
                loadWhatsappUnassigned();
            }
            if (!silent) {
                try {
                    var h = (location.hash || '').replace(/^#/, '');
                    if (h.indexOf('whatsapp') === 0) location.hash = 'whatsapp';
                } catch (_) {}
            }
        }
        function waBtnLoading(btn, on) {
            if (!btn) return;
            btn.disabled = !!on;
            btn.classList.toggle('is-loading', !!on);
        }
        function refreshWhatsappStatusDebounced() {
            var now = Date.now();
            if (now < _whatsappRefreshBusyUntil) {
                toast(LANG === 'fa' ? 'چند ثانیه صبر کنید و دوباره تلاش کنید.' : 'Please wait a few seconds before refreshing again.', true);
                return;
            }
            _whatsappRefreshBusyUntil = now + 2200;
            var b = document.getElementById('btnRefreshStatus');
            if (b) { b.classList.add('is-refreshing'); b.setAttribute('aria-busy', 'true'); }
            loadWhatsappStatus(true).finally(function () {
                if (typeof loadWhatsappOverview === 'function') loadWhatsappOverview();
                setTimeout(function () {
                    _whatsappRefreshBusyUntil = Math.max(_whatsappRefreshBusyUntil, Date.now() + 400);
                    if (b) { b.classList.remove('is-refreshing'); b.removeAttribute('aria-busy'); }
                }, 300);
            });
        }

        function setWhatsappStatusBadge(status) {
            const badge = document.getElementById('whatsappStatusBadge');
            if (badge) {
                badge.className = 'whatsapp-status-badge whatsapp-status-' + status;
                if (status === 'connected') badge.textContent = LANG === 'fa' ? 'متصل' : 'Connected';
                else if (status === 'starting') badge.textContent = LANG === 'fa' ? 'در حال اتصال...' : 'Connecting...';
                else if (status === 'checking') badge.textContent = LANG === 'fa' ? 'در حال بررسی...' : 'Checking...';
                else badge.textContent = LANG === 'fa' ? 'قطع' : 'Disconnected';
            }
            const headerStatus = document.getElementById('headerWhatsappStatus');
            if (headerStatus) headerStatus.classList.toggle('connected', status === 'connected');
        }
        async function fetchWhatsappHeaderStatus() {
            const perms = (currentUser && currentUser.permissions) || {};
            if (!token || perms.whatsapp === false) return;
            try {
                const res = await apiFetch('/api/gateway/status', { timeoutMs: 10000 });
                if (res.ok && res.data && res.data.whatsapp) setWhatsappStatusBadge('connected');
                else setWhatsappStatusBadge('disconnected');
            } catch (_) { setWhatsappStatusBadge('disconnected'); }
        }

        async function loadWhatsappStatus(isInitial) {
            const mySeq = ++_whatsappStatusSeq;
            function waAlive() { return mySeq === _whatsappStatusSeq; }
            const perms = (currentUser && currentUser.permissions) || {};
            if (!token || perms.whatsapp === false) return;
            const st = document.getElementById('gatewayStatus');
            const qrBox = document.getElementById('qrBox');
            const qrUnavailable = document.getElementById('whatsappQrUnavailable');
            const qrWaitingMsg = document.getElementById('qrWaitingMsg');
            const qrImg = document.getElementById('qrImg');
            const btn = document.getElementById('btnStartGateway');
            const btnStartClient = document.getElementById('btnStartWhatsApp');
            const btnDisconnect = document.getElementById('btnDisconnectWhatsApp');
            const lastCard = document.getElementById('whatsappLastConnectionCard');
            if (!st || !qrBox || !qrImg) return;
            if (qrRetryTimeout) { clearTimeout(qrRetryTimeout); qrRetryTimeout = null; }
            if (qrRefreshInterval) { clearInterval(qrRefreshInterval); qrRefreshInterval = null; }
            if (isInitial !== false) {
                st.className = 'whatsapp-status-line empty';
                st.textContent = t('whatsapp_checking');
                setWhatsappStatusBadge('checking');
                if (btn) btn.style.display = 'none';
                if (btnStartClient) btnStartClient.style.display = 'none';
                if (btnDisconnect) btnDisconnect.disabled = true;
                qrBox.style.display = 'none';
                if (qrUnavailable) qrUnavailable.style.display = 'none';
                if (qrWaitingMsg) qrWaitingMsg.style.display = 'none';
                const af = document.getElementById('whatsappAuthFailure');
                if (af) { af.style.display = 'none'; af.textContent = ''; }
            }
            let ping;
            try { ping = await apiFetch('/api/ping', { auth: false, timeoutMs: 8000 }); } catch (e) { ping = { needLogin: true }; }
            if (!waAlive()) return;
            if (ping.needLogin || (ping.data && !ping.data.ok)) {
                st.className = 'whatsapp-status-line empty';
                st.textContent = t('whatsapp_server_err');
                setWhatsappStatusBadge('disconnected');
                return;
            }
            const res = await apiFetch('/api/gateway/status', { timeoutMs: 15000 });
