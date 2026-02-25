package com.kaya.crm.ui.main.tickets

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ConfirmationNumber
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.kaya.crm.data.models.TicketItem

@Composable
fun TicketsScreen(viewModel: TicketsViewModel = hiltViewModel()) {
    val tickets by viewModel.tickets.collectAsState()
    val loading by viewModel.loading.collectAsState()
    val error by viewModel.error.collectAsState()

    LaunchedEffect(Unit) { viewModel.load() }

    if (error != null && tickets.isEmpty()) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(error!!, color = MaterialTheme.colorScheme.error)
                Spacer(modifier = Modifier.height(16.dp))
                Button(onClick = { viewModel.clearError(); viewModel.load() }) { Text("تلاش مجدد") }
            }
        }
    } else if (loading && tickets.isEmpty()) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            CircularProgressIndicator()
        }
    } else {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(tickets, key = { it.id }) { ticket ->
                TicketItem(ticket = ticket)
            }
        }
    }
}

@Composable
private fun TicketItem(ticket: TicketItem) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(Icons.Default.ConfirmationNumber, contentDescription = null)
            Spacer(modifier = Modifier.width(16.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = ticket.displayTitle,
                    style = MaterialTheme.typography.titleMedium
                )
                Text(
                    text = ticket.status,
                    style = MaterialTheme.typography.bodySmall
                )
            }
        }
    }
}
