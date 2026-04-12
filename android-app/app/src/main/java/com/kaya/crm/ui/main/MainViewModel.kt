package com.kaya.crm.ui.main

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.kaya.crm.data.api.ApiService
import com.kaya.crm.data.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class MainViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val api: ApiService
) : ViewModel() {

    val currentUser = authRepository.currentUser.stateIn(
        viewModelScope,
        SharingStarted.WhileSubscribed(5000),
        null
    )

    private val _hiddenPanelPages = MutableStateFlow<Set<String>>(emptySet())
    val hiddenPanelPages: StateFlow<Set<String>> = _hiddenPanelPages.asStateFlow()

    init {
        refreshPanelVisibility()
    }

    /** بخش‌های مخفی‌شده توسط مدیر (مثل منوی وب) */
    fun refreshPanelVisibility() {
        viewModelScope.launch {
            try {
                val r = api.getPublicVisibility()
                if (r.isSuccessful) {
                    _hiddenPanelPages.value = r.body()?.hiddenSections?.toSet() ?: emptySet()
                }
            } catch (_: Exception) {
                /* نادیده — بدون مخفی‌سازی اضافه */
            }
        }
    }

    fun logout() {
        viewModelScope.launch {
            authRepository.logout()
        }
    }
}
