import { Component, OnInit, OnDestroy, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PedidoService } from '../../services/pedido.service';
import { MensagemService } from '../../services/mensagem.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-delivery',
  imports: [CommonModule, FormsModule],
  templateUrl: './delivery.html',
  styleUrl: './delivery.css'
})
export class Delivery implements OnInit, OnDestroy {

  constructor(
    private router: Router,
    private pedidoService: PedidoService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    private mensagemService: MensagemService,
  ) {}

  // Identificação do motoboy (futuramente vem do login)
  motoboyId = 'motoboy-fixo';
  motoboyNome = 'Motoboy Villa Brasa';

  // Subscriptions
  private disponiveisSub: Subscription | null = null;
  private meusPedidosSub: Subscription | null = null;

  abaAtiva: 'disponiveis' | 'andamento' | 'concluidas' | 'cancelados' = 'disponiveis';
  pedidos: any[] = [];

  // Armazena cada origem separadamente pra mesclar sem bugs
  private todosDisponiveis: any[] = [];
  private todosMeusPedidos: any[] = [];

  ngOnInit() {
    // Escuta pedidos PRONTOS no Firestore (disponíveis pra aceitar)
    this.disponiveisSub = this.pedidoService.listarPorStatus('Pronto').subscribe({
      next: (pedidosFirestore) => {
        this.ngZone.run(() => {
          console.log('🔵 DELIVERY: Disponíveis recebidos:', pedidosFirestore.length);
          this.atualizarLista(pedidosFirestore, 'disponivel');
        });
      },
      error: (erro) => console.error('🔴 DELIVERY: ERRO disponíveis:', erro)
    });

    // Escuta pedidos atribuídos a ESSE motoboy
    this.meusPedidosSub = this.pedidoService.listarPorMotoboy(this.motoboyId).subscribe({
      next: (pedidosFirestore) => {
        this.ngZone.run(() => {
          console.log('🔵 DELIVERY: Meus pedidos recebidos:', pedidosFirestore.length);
          this.atualizarLista(pedidosFirestore, 'meus');
        });
      },
      error: (erro) => console.error('🔴 DELIVERY: ERRO meus pedidos:', erro)
    });
  }

  ngOnDestroy() {
    if (this.disponiveisSub) this.disponiveisSub.unsubscribe();
    if (this.meusPedidosSub) this.meusPedidosSub.unsubscribe();
  }

  // Atualiza array local mesclando origem (disponíveis vs meus)
  private atualizarLista(novosPedidos: any[], origem: 'disponivel' | 'meus') {
    const convertidos = novosPedidos.map(p => this.converterPedido(p));

    // Armazena por origem (pra não misturar)
    if (origem === 'disponivel') {
      // Só os SEM motoboy ainda atribuído
      this.todosDisponiveis = convertidos.filter(p => !p.motoboyId);
    } else {
      this.todosMeusPedidos = convertidos;
    }

    // Reconstroi this.pedidos combinando os 2 (sem duplicar por idFirestore)
    // "Meus pedidos" tem prioridade sobre "disponíveis"
    const mapa = new Map<string, any>();
    for (const p of this.todosMeusPedidos) {
      mapa.set(p.idFirestore, p);
    }
    for (const p of this.todosDisponiveis) {
      if (!mapa.has(p.idFirestore)) mapa.set(p.idFirestore, p);
    }
    this.pedidos = Array.from(mapa.values());

    console.log('🟢 DELIVERY: pedidos totais:', this.pedidos.length,
                '| disponíveis:', this.pedidosDisponiveis.length,
                '| em andamento:', this.pedidosEmAndamento.length);

    // Sincroniza o pedido em detalhe (se estiver aberto)
    if (this.pedidoEmDetalhe) {
      const atualizado = this.pedidos.find(p => p.idFirestore === this.pedidoEmDetalhe.idFirestore);
      if (atualizado) {
        Object.assign(this.pedidoEmDetalhe, atualizado);
      }
    }

    this.cdr.detectChanges();
  }

  // Converte pedido do Firestore para formato do Delivery
  private converterPedido(p: any): any {
    const totalItens = (p.itens || []).reduce((soma: number, item: any) => soma + (item.qtd || 1), 0);
    const valorNum = typeof p.valor === 'string'
      ? parseFloat(p.valor.replace(',', '.'))
      : (p.valor || 0);

    const statusMap: { [key: string]: string } = {
      'Pronto': 'disponivel',
      'Em Entrega': 'andamento',
      'Entregue': 'concluida',
      'Finalizado': 'concluida',
      'Cancelado': 'cancelado'
    };

    return {
      id: p.numero || p.id,
      idFirestore: p.id,
      itens: totalItens,
      pago: p.formaPagamento && !p.formaPagamento.includes('Dinheiro'),
      retirarEm: 'Av. Paulista, 1000',
      entregarEm: p.endereco || 'Endereço não informado',
      distancia: this.gerarDistanciaMockada(p.id),
      tempo: this.gerarTempoMockada(p.id),
      ganho: valorNum * 0.15,
      status: statusMap[p.status] || 'disponivel',
      horaDisponivel: p.hora || '',
      horaAceite: p.horaAceite || null,
      horaConclusao: p.horaConclusao || null,
      horaCancelamento: p.horaCancelamento || null,
      motivoCancelamento: p.motivoCancelamento || null,
      observacoesCancelamento: p.observacoesCancelamento || null,
      motoboyId: p.motoboyId || null,
      cliente: p.cliente || 'Cliente',
      formaPagamento: p.formaPagamento || 'Dinheiro',
      observacoes: p.observacoes || '',
      itensDetalhados: (p.itens || []).map((it: any) => ({ nome: it.nome, qtd: it.qtd }))
    };
  }

  // Filtros por aba
  get pedidosDisponiveis() { return this.pedidos.filter(p => p.status === 'disponivel'); }
  get pedidosEmAndamento() { return this.pedidos.filter(p => p.status === 'andamento'); }
  get pedidosConcluidos() { return this.pedidos.filter(p => p.status === 'concluida'); }
  get pedidosCancelados() { return this.pedidos.filter(p => p.status === 'cancelado'); }

  get totalCancelados(): number { return this.pedidosCancelados.length; }
  get totalDisponiveis(): number { return this.pedidosDisponiveis.length; }
  get totalEmRota(): number { return this.pedidosEmAndamento.length; }
  get totalHoje(): number { return this.pedidosConcluidos.length; }

  get pedidosVisiveis() {
    if (this.abaAtiva === 'disponiveis') return this.pedidosDisponiveis;
    if (this.abaAtiva === 'andamento') return this.pedidosEmAndamento;
    if (this.abaAtiva === 'concluidas') return this.pedidosConcluidos;
    return this.pedidosCancelados;
  }

  // AÇÕES - gravam no Firestore
  async aceitarEntrega(pedido: any) {
    if (!confirm(`Aceitar entrega do pedido #${pedido.id}?`)) return;
    try {
      await this.pedidoService.atribuirMotoboy(
        pedido.idFirestore,
        this.motoboyId,
        this.motoboyNome
      );
      this.abaAtiva = 'andamento';
      // Espera o Firestore retornar o pedido atualizado
      setTimeout(() => {
        const atualizado = this.pedidos.find(p => p.idFirestore === pedido.idFirestore);
        if (atualizado) this.abrirDetalhePedido(atualizado);
      }, 500);
    } catch (erro) {
      console.error('Erro ao aceitar:', erro);
      alert('Erro ao aceitar entrega. Tente novamente.');
    }
  }

  async marcarComoEntregue(pedido: any) {
    if (!confirm(`Confirmar entrega do pedido #${pedido.id}?`)) return;
    try {
      await this.pedidoService.marcarEntregue(pedido.idFirestore);
      this.abaAtiva = 'concluidas';
    } catch (erro) {
      console.error('Erro ao marcar entregue:', erro);
      alert('Erro ao marcar entrega. Tente novamente.');
    }
  }

  // DETALHE DA ENTREGA
  pedidoEmDetalhe: any = null;
  estadoEntrega: 'indo_restaurante' | 'coletando' | 'pedido_coletado' | 'a_caminho' = 'indo_restaurante';

  get textoStatusEntrega(): string {
    const map: any = {
      'indo_restaurante': 'Indo para o restaurante',
      'coletando': 'Coletando pedido',
      'pedido_coletado': 'Pedido coletado',
      'a_caminho': 'A caminho do cliente'
    };
    return map[this.estadoEntrega];
  }

  get textoBotaoEntrega(): string {
    const map: any = {
      'indo_restaurante': 'Cheguei no Restaurante',
      'coletando': 'Pedido Retirado',
      'pedido_coletado': 'Iniciar Rota',
      'a_caminho': 'Finalizar Entrega'
    };
    return map[this.estadoEntrega];
  }

  get iconeBotaoEntrega(): string {
    const map: any = {
      'indo_restaurante': 'caixa',
      'coletando': 'caixa',
      'pedido_coletado': 'navegacao',
      'a_caminho': 'check'
    };
    return map[this.estadoEntrega];
  }

  get botaoFinalEntrega(): boolean {
    return this.estadoEntrega === 'a_caminho';
  }

  abrirDetalhePedido(pedido: any) {
    if (!pedido.instrucoes) {
      pedido.instrucoes = 'Ligar ao chegar. Portão automático.';
    }
    this.pedidoEmDetalhe = pedido;
    this.estadoEntrega = 'indo_restaurante';
  }

  voltarDaDetalhe() {
    this.pedidoEmDetalhe = null;
  }

  avancarEntrega() {
    if (this.estadoEntrega === 'indo_restaurante') {
      this.estadoEntrega = 'coletando';
    } else if (this.estadoEntrega === 'coletando') {
      this.estadoEntrega = 'pedido_coletado';
    } else if (this.estadoEntrega === 'pedido_coletado') {
      this.estadoEntrega = 'a_caminho';
    } else {
      this.finalizarEntregaComSucesso();
    }
  }

  async finalizarEntregaComSucesso() {
    if (!this.pedidoEmDetalhe) return;
    try {
      await this.pedidoService.marcarEntregue(this.pedidoEmDetalhe.idFirestore);
      this.pedidoEmDetalhe.entregaConcluida = true;
    } catch (erro) {
      console.error('Erro ao finalizar:', erro);
      alert('Erro ao finalizar entrega. Tente novamente.');
    }
  }

  verProximasEntregas() {
    this.pedidoEmDetalhe = null;
    this.abaAtiva = 'concluidas';
  }

  // ZOOM
  zoomMapa = 1.0;
  zoomMais() { if (this.zoomMapa < 2.5) this.zoomMapa += 0.25; }
  zoomMenos() { if (this.zoomMapa > 0.5) this.zoomMapa -= 0.25; }

  // ============================================
  // CHAT (real, via Firestore)
  // ============================================
  chatAberto = false;
  mensagemDigitada = '';
  mensagensChat: any[] = [];
  private mensagensSub: Subscription | null = null;

  respostasRapidas = [
    { emoji: '📍', texto: 'Estou a caminho!' },
    { emoji: '✅', texto: 'Cheguei no local' },
    { emoji: '⏱️', texto: 'Aguarde 5 minutos' }
  ];

  abrirChat() {
    if (!this.pedidoEmDetalhe) return;
    this.chatAberto = true;

    // Mesmo ID que o cliente usa pra escutar (idFirestore)
    const pedidoId = this.pedidoEmDetalhe.idFirestore;

    // Escuta as mensagens DESTE pedido em tempo real
    this.mensagensSub = this.mensagemService.listarPorPedido(pedidoId).subscribe({
      next: (mensagens) => {
        this.ngZone.run(() => {
          this.mensagensChat = mensagens;
          this.cdr.detectChanges();
        });
      },
      error: (erro) => console.error('🔴 CHAT: erro ao escutar mensagens:', erro)
    });
  }

  fecharChat() {
    this.chatAberto = false;
    if (this.mensagensSub) {
      this.mensagensSub.unsubscribe();
      this.mensagensSub = null;
    }
  }

  async enviarMensagem() {
    const texto = this.mensagemDigitada.trim();
    if (!texto || !this.pedidoEmDetalhe) return;

    const pedidoId = this.pedidoEmDetalhe.idFirestore;
    this.mensagemDigitada = ''; // limpa o input na hora

    try {
      // Grava como 'motoboy' — o cliente recebe em tempo real
      await this.mensagemService.enviar(pedidoId, 'motoboy', texto);
    } catch (erro) {
      console.error('🔴 CHAT: erro ao enviar mensagem:', erro);
      alert('Não foi possível enviar a mensagem. Tente novamente.');
    }
  }

  enviarRespostaRapida(resp: { emoji: string, texto: string }) {
    this.mensagemDigitada = `${resp.emoji} ${resp.texto}`;
    this.enviarMensagem();
  }

  onEnterChat(event: any) {
    if (event.key === 'Enter') this.enviarMensagem();
  }

  // CANCELAMENTO - grava no Firestore
  cancelamentoAberto = false;
  motivoSelecionado: string | null = null;
  informacoesAdicionais = '';

  motivosCancelamento = [
    { id: 'cliente_nao_encontrado', titulo: 'Cliente não encontrado', descricao: 'Não consegui localizar o cliente no endereço informado', icone: 'usuario_off' },
    { id: 'cliente_nao_atende', titulo: 'Cliente não atende', descricao: 'Liguei várias vezes mas o cliente não atende', icone: 'x_circulo' },
    { id: 'endereco_incorreto', titulo: 'Endereço incorreto', descricao: 'O endereço fornecido está incorreto ou incompleto', icone: 'alerta' },
    { id: 'local_inseguro', titulo: 'Local inseguro', descricao: 'O local apresenta riscos à minha segurança', icone: 'alerta' },
    { id: 'cliente_recusou', titulo: 'Cliente recusou o pedido', descricao: 'Cliente não quer mais receber o pedido', icone: 'x_circulo' }
  ];

  clienteNaoEncontrado() {
    this.cancelamentoAberto = true;
    this.motivoSelecionado = 'cliente_nao_encontrado';
    this.informacoesAdicionais = '';
  }

  fecharCancelamento() {
    this.cancelamentoAberto = false;
    this.motivoSelecionado = null;
    this.informacoesAdicionais = '';
  }

  selecionarMotivo(motivoId: string) {
    this.motivoSelecionado = motivoId;
  }

  async confirmarCancelamento() {
    if (!this.motivoSelecionado) {
      alert('Selecione um motivo para o cancelamento!');
      return;
    }
    const motivo = this.motivosCancelamento.find(m => m.id === this.motivoSelecionado);
    if (!confirm(`Confirmar cancelamento por "${motivo?.titulo}"?`)) return;
    if (!this.pedidoEmDetalhe) return;
    try {
      await this.pedidoService.cancelarEntrega(
        this.pedidoEmDetalhe.idFirestore,
        motivo?.titulo || '',
        this.informacoesAdicionais
      );
      alert(`✅ Entrega cancelada. Veja na aba "Cancelados".`);
      this.cancelamentoAberto = false;
      this.motivoSelecionado = null;
      this.informacoesAdicionais = '';
      this.pedidoEmDetalhe = null;
      this.abaAtiva = 'cancelados';
    } catch (erro) {
      console.error('Erro ao cancelar:', erro);
      alert('Erro ao cancelar. Tente novamente.');
    }
  }

  get caracteresInfoAdicional(): number {
    return this.informacoesAdicionais.length;
  }

  ligarParaCliente() {
    alert('📞 Ligando para o cliente...');
  }

  // HELPERS
  private gerarDistanciaMockada(id: string): number {
    if (!id) return 2.5;
    const seed = id.charCodeAt(id.length - 1);
    return Math.round((seed % 5 + 1) * 10) / 10;
  }

  private gerarTempoMockada(id: string): number {
    if (!id) return 15;
    const seed = id.charCodeAt(id.length - 1);
    return (seed % 4 + 1) * 5;
  }

  calcularHora(minutosAtras: number): string {
    const agora = new Date();
    agora.setMinutes(agora.getMinutes() + minutosAtras);
    return agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  sair() {
    if (confirm('Sair do app?')) {
      this.router.navigate(['/login']);
    }
  }
}