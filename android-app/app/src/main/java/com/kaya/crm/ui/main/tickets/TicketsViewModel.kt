package com.kaya.crm.ui.main.tickets

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.kaya.crm.data.models.TicketItem
import com.kaya.crm.data.repository.CrmRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class TicketsViewModel @Inject constructor(
    private val repo: CrmRepository
) : ViewModel() {

    private val _tickets = MutableStateFlow<List<TicketItem>>(emptyList())
    val tickets: StateFlow<List<TicketItem>> = _tickets.asStateFlow()

    private val _loading = MutableStateFlow(false)
    val loading: StateFlow<Boolean> = _loading.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    fun load() {
        viewModelScope.launch {
            _loading.value = true
            _error.value = null
            repo.getTickets()
                .onSuccess { _tickets.value = it.data ?: it.tickets ?: emptyList() }
                .onFailure { _error.value = it.message }
            _loading.value = false
        }
    }

    fun clearError() { _error.value = null }
}
