package com.kaya.crm.ui.main.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.kaya.crm.data.models.DashboardResponse
import com.kaya.crm.data.repository.CrmRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import javax.inject.Inject

@HiltViewModel
class DashboardViewModel @Inject constructor(
    private val repo: CrmRepository
) : ViewModel() {

    private val _dashboard = MutableStateFlow<DashboardResponse?>(null)
    val dashboard: StateFlow<DashboardResponse?> = _dashboard.asStateFlow()

    private val _loading = MutableStateFlow(false)
    val loading: StateFlow<Boolean> = _loading.asStateFlow()

    private val _refreshing = MutableStateFlow(false)
    val refreshing: StateFlow<Boolean> = _refreshing.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    private val _lastUpdatedLabel = MutableStateFlow<String?>(null)
    val lastUpdatedLabel: StateFlow<String?> = _lastUpdatedLabel.asStateFlow()

    fun load() {
        viewModelScope.launch {
            _loading.value = true
            _error.value = null
            fetchDashboard()
            _loading.value = false
        }
    }

    fun refresh() {
        viewModelScope.launch {
            _refreshing.value = true
            _error.value = null
            fetchDashboard()
            _refreshing.value = false
        }
    }

    private suspend fun fetchDashboard() {
        repo.getDashboard()
            .onSuccess {
                _dashboard.value = it
                val fmt = SimpleDateFormat("HH:mm", Locale.getDefault())
                _lastUpdatedLabel.value = "به‌روز در ${fmt.format(Date())}"
            }
            .onFailure { _error.value = it.message }
    }

    fun clearError() { _error.value = null }
}
