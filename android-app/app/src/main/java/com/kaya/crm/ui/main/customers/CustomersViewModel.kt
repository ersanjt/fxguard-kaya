package com.kaya.crm.ui.main.customers

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.kaya.crm.data.models.CustomerItem
import com.kaya.crm.data.repository.CrmRepository
import dagger.hilt.android.lifecycle.HiltViewModel
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

    private val _loading = MutableStateFlow(false)
    val loading: StateFlow<Boolean> = _loading.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    fun load() {
        viewModelScope.launch {
            _loading.value = true
            _error.value = null
            repo.getCustomers()
                .onSuccess { _customers.value = it.data }
                .onFailure { _error.value = it.message }
            _loading.value = false
        }
    }

    fun clearError() { _error.value = null }
}
