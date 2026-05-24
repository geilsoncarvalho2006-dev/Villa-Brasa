import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PedidoService, Pedido } from '../../services/pedido.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-kitchen',
  imports: [CommonModule, FormsModule],
  templateUrl: './kitchen.html', 
  styleUrl: './kitchen.css'
})
export class Kitchen implements OnInit, OnDestroy {

  constructor(
    private router: Router,
    private pedidoService: PedidoService,
     private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  // Lista de chefs disponíveis para atribuir
  chefsDisponiveis = ['Chef Carlos', 'Chef Ana', 'Chef Roberto', 'Chef Mariana'];

  // Modal de atribuir chef
  modalChefAberto = false;
  pedidoSelecionado: any = null;

  // Timer para atualizar "tempo decorrido"
  tempoInterval: any = null;
  refreshTrigger = 0;

  // Subscription pra cancelar quando sair da tela
  private pedidosSub: Subscription | null = null;

  // ============================================
  // PEDIDOS - agora vem do Firestore em tempo real
  // ============================================
  pedidos: any[] = [];

  // ============================================
  // MAPA: status Firestore → status interno Kitchen
  // ============================================
  private mapaStatusFirestoreParaKitchen: { [key: string]: string } = {
    'Pendente': 'pendente',
    'Em Preparo': 'preparando',
    'Pronto': 'pronto',
    'Em Entrega': 'entrega',
    'Cancelado': 'cancelado'
  };

  // ============================================
  // MAPA: status interno Kitchen → status Firestore
  // ============================================
  private mapaStatusKitchenParaFirestore: { [key: string]: string } = {
    'pendente': 'Pendente',
    'preparando': 'Em Preparo',
    'pronto': 'Pronto',
    'entrega': 'Em Entrega',
    'cancelado': 'Cancelado'
  };

  // ============================================
  // LIFECYCLE
  // ============================================
ngOnInit() {
    console.log('🔵 KITCHEN: ngOnInit chamado');

    this.pedidosSub = this.pedidoService
      .listarPorStatus(['Pendente', 'Em Preparo', 'Pronto', 'Em Entrega', 'Cancelado'])
      .subscribe({
        next: (pedidosFirestore) => {
          // Força atualização dentro do NgZone (necessário pra Firestore)
          this.ngZone.run(() => {
            console.log('🟢 KITCHEN: Recebido do Firestore:', pedidosFirestore.length, 'pedidos');

            this.pedidos = pedidosFirestore.map(p => this.converterPedidoFirestore(p));

            console.log('🟢 KITCHEN: Pendentes:', this.pedidosPendentes.length);

            // Força a tela a atualizar
            this.cdr.detectChanges();
          });
        },
        error: (erro) => {
          console.error('🔴 KITCHEN: ERRO no Observable:', erro);
        }
      });

    this.tempoInterval = setInterval(() => {
      this.refreshTrigger++;
    }, 30000);
  }

  ngOnDestroy() {
    if (this.tempoInterval) {
      clearInterval(this.tempoInterval);
    }
    if (this.pedidosSub) {
      this.pedidosSub.unsubscribe();
    }
  }

  // ============================================
  // CONVERSOR: pedido do Firestore → formato Kitchen
  // ============================================
  private converterPedidoFirestore(p: Pedido): any {
    // Pega a data de criação (Firestore Timestamp ou Date)
    let dataCriacao: Date;
    if (p.criadoEm && typeof p.criadoEm.toDate === 'function') {
      // É um Firestore Timestamp
      dataCriacao = p.criadoEm.toDate();
    } else if (p.criadoEm instanceof Date) {
      dataCriacao = p.criadoEm;
    } else {
      dataCriacao = new Date();
    }

    return {
      id: p.id,                                                        // ID do Firestore
      numero: p.numero,                                                // ORD-XXX
      cliente: p.cliente || 'Cliente',
      origem: 'App',                                                   // todo pedido vem do app por enquanto
      prioridade: false,
      status: this.mapaStatusFirestoreParaKitchen[p.status] || 'pendente',
      criadoEm: dataCriacao,
      chef: (p as any).chef || null,
      observacao: p.observacoes || '',
      itens: p.itens || []
    };
  }

  // ============================================
  // HELPERS
  // ============================================
  tempoDecorrido(pedido: any): number {
    const agora = new Date().getTime();
    const criado = new Date(pedido.criadoEm).getTime();
    return Math.floor((agora - criado) / 60000);
  }

  // ============================================
  // GETTERS — listas filtradas por status
  // ============================================
  get pedidosPendentes() { return this.pedidos.filter(p => p.status === 'pendente'); }
  get pedidosPreparando() { return this.pedidos.filter(p => p.status === 'preparando'); }
  get pedidosProntos() { return this.pedidos.filter(p => p.status === 'pronto'); }
  get pedidosEntrega() { return this.pedidos.filter(p => p.status === 'entrega'); }
  get pedidosCancelados() { return this.pedidos.filter(p => p.status === 'cancelado'); }

  get totalPedidos() { return this.pedidos.length; }

  // ============================================
  // MOVIMENTAÇÃO ENTRE COLUNAS
  // Agora atualiza no Firestore em vez de só localmente
  // ============================================
  async proximoStatus(pedido: any) {
    const fluxo: { [key: string]: string } = {
      'pendente': 'preparando',
      'preparando': 'pronto',
      'pronto': 'entrega'
    };

    const novoStatusInterno = fluxo[pedido.status];
    if (!novoStatusInterno) return;

    // Converte pro formato Firestore (maiúscula)
    const novoStatusFirestore = this.mapaStatusKitchenParaFirestore[novoStatusInterno];

    try {
      // Atualiza no Firestore
      await this.pedidoService.atualizarStatus(pedido.id, novoStatusFirestore);
      // A tela atualiza sozinha porque está escutando o Observable
    } catch (erro) {
      console.error('Erro ao atualizar status:', erro);
      alert('Erro ao atualizar status. Tente novamente.');
    }
  }

  async cancelarPedido(pedido: any) {
    if (!confirm(`Cancelar Pedido #${pedido.numero || pedido.id}?`)) return;

    try {
      await this.pedidoService.atualizarStatus(pedido.id, 'Cancelado');
    } catch (erro) {
      console.error('Erro ao cancelar pedido:', erro);
      alert('Erro ao cancelar. Tente novamente.');
    }
  }

  textoBotaoAvancar(status: string): string {
    if (status === 'pendente') return '▶ Iniciar Preparo';
    if (status === 'preparando') return '✓ Marcar como Pronto';
    if (status === 'pronto') return '🛵 Saiu para Entrega';
    return '';
  }

  // ============================================
  // ATRIBUIR CHEF (mantido local por enquanto)
  // ============================================
  abrirModalChef(pedido: any) {
    this.pedidoSelecionado = pedido;
    this.modalChefAberto = true;
  }

  fecharModalChef() {
    this.modalChefAberto = false;
    this.pedidoSelecionado = null;
  }

  async selecionarChef(chef: string) {
    if (this.pedidoSelecionado) {
      try {
        // Salva chef no Firestore (persistente)
        await this.pedidoService.atualizar(this.pedidoSelecionado.id, { 
          chef: chef 
        } as any);
        this.fecharModalChef();
      } catch (erro) {
        console.error('Erro ao salvar chef:', erro);
        alert('Erro ao atribuir chef. Tente novamente.');
      }
    }
  }

  // ============================================
  // SAIR DA CONTA
  // ============================================
  sair() {
    if (confirm('Sair da Cozinha?')) {
      this.router.navigate(['/login']);
    }
  }
}