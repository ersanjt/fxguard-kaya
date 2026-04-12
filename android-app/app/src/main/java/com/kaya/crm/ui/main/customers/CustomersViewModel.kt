package com.kaya.crm.ui.main.customers

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.kaya.crm.data.models.CustomerDetail
import com.kaya.crm.data.models.CustomerItem
import com.kaya.crm.data.repository.CrmRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class CustomersViewModel @Inject constructor(
    private val repo: CrmRepository
) : ViewModel() {

    private val _customers = MutableStateFlow<List<CustomerItem>>(emptyList())
    val customers: StateFlow<List<CustomerItem>> = _customers.asStateFlow()

    private val _total = MutableStateFlow(0)
    val total: StateFlow<Int> = _total.asStateFlow()

    private val _page = MutableStateFlow(1)
    val page: StateFlow<Int> = _page.asStateFlow()

    private val _loading = MutableStateFlow(false)
    val loading: StateFlow<Boolean> = _loading.asStateFlow()

    private val _loadingMore = MutableStateFlow(false)
    val loadingMore: StateFlow<Boolean> = _loadingMore.asStateFlow()

    private val _refreshing = MutableStateFlow(false)
    val refreshing: StateFlow<Boolean> = _refreshing.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    private val _searchText = MutableStateFlow("")
    val searchText: StateFlow<String> = _searchText.asStateFlow()

    /** null = همه؛ active / inactive / blocked */
    private val _statusFilter = MutableStateFlow<String?>(null)
    val statusFilter: StateFlow<String?> = _statusFilter.asStateFlow()

    private val _selectedCustomerId = MutableStateFlow<String?>(null)
    val selectedCustomerId: StateFlow<String?> = _selectedCustomerId.asStateFlow()

    private val _customerDetail = MutableStateFlow<CustomerDetail?>(null)
    val customerDetail: StateFlow<CustomerDetail?> = _customerDetail.asStateFlow()

    private val _detailLoading = MutableStateFlow(false)
    val detailLoading: StateFlow<Boolean> = _detailLoading.asStateFlow()

    private val _detailError = MutableStateFlow<String?>(null)
    val detailError: StateFlow<String?> = _detailError.asStateFlow()

    /** شناسهٔ مکالمهٔ باز مرتبط با همان ردیف لیست (در پاسخ GET /customers/:id نیست). */
    private val _linkedConversationId = MutableStateFlow<String?>(null)
    val linkedConversationId: StateFlow<String?> = _linkedConversationId.asStateFlow()

    private var searchDebounceJob: Job? = null

    private fun currentSearchQuery(): String? =
        _searchText.value.trim().takeIf { it.isNotEmpty() }

    fun setSearchText(text: String) {
        _searchText.value = text
        searchDebounceJob?.cancel()
        searchDebounceJob = viewModelScope.launch {
            delay(400)
            load(reset = true)
        }
    }

    fun setStatusFilter(status: String?) {
        _statusFilter.value = status
        load(reset = true)
    }

    private fun currentStatus(): String? = _statusFilter.value

    fun load(reset: Boolean = true) {
        viewModelScope.launch {
            if (reset) {
                _loading.value = true
                _page.value = 1
            }
            _error.value = null
            repo.getCustomers(page = 1, search = currentSearchQuery(), status = currentStatus())
                .onSuccess {
                    _customers.value = it.data
                    _total.value = it.total
                    _page.value = 1
                }
                .onFailure { _error.value = it.message }
            _loading.value = false
        }
    }

    fun refresh() {
        viewModelScope.launch {
            _refreshing.value = true
            _error.value = null
            repo.getCustomers(page = 1, search = currentSearchQuery(), status = currentStatus())
                .onSuccess {
                    _customers.value = it.data
                    _total.value = it.total
                    _page.value = 1
                }
                .onFailure { _error.value = it.message }
            _refreshing.value = false
        }
    }

    fun loadMore() {
        if (_loadingMore.value || _loading.value) return
        if (_customers.value.size >= _total.value) return
        viewModelScope.launch {
            _loadingMore.value = true
            val next = _page.value + 1
            repo.getCustomers(page = next, search = currentSearchQuery(), status = currentStatus())
                .onSuccess {
                    _page.value = next
                    _customers.value = _customers.value + it.data
                    _total.value = it.total
                }
                .onFailure { _error.value = it.message }
            _loadingMore.value = false
        }
    }

    fun clearError() { _error.value = null }

    fun openCustomer(customer: CustomerItem) {
        _selectedCustomerId.value = customer.id
        _linkedConversationId.value = customer.lastOpenConv?.id
        _customerDetail.value = null
        _detailError.value = null
        viewModelScope.launch {
            _detailLoading.value = true
            repo.getCustomer(customer.id)
                .onSuccess { _customerDetail.value = it }
                .onFailure { _detailError.value = it.message }
            _detailLoading.value = false
        }
    }

    fun closeCustomerDetail() {
        _selectedCustomerId.value = null
        _linkedConversationId.value = null
        _customerDetail.value = null
        _detailError.value = null
    }

    fun clearDetailError() { _detailError.value = null }
}
