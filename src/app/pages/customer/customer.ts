import { Component, OnInit, OnDestroy, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BannerService, Banner } from '../../services/banner.service';
import { PedidoService } from '../../services/pedido.service';
import { MensagemService } from '../../services/mensagem.service';
import { ProdutoService, Produto } from '../../services/produto.service';
import { ConfiguracaoService, ConfiguracaoDelivery } from '../../services/configuracao.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-customer',
  imports: [CommonModule, FormsModule],
  templateUrl: './customer.html',
  styleUrl: './customer.css'
})
export class Customer implements OnInit, OnDestroy {

  constructor(
    private router: Router,
    private bannerService: BannerService,
    private pedidoService: PedidoService,
    private produtoService: ProdutoService,
    private configuracaoService: ConfiguracaoService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    private mensagemService: MensagemService,
  ) {}

  // ============================================
  // VARIÁVEIS DE NAVEGAÇÃO
  // ============================================
  aba: string = 'cardapio';
  abaPedidos = 'ativos';
  categoriaSelecionada = 'Todos';
  buscaProduto = '';

  // ============================================
  // BANNER (CARROSSEL)
  // ============================================
  bannerAtual = 0;
  bannerInterval: any;

  // Lista de banners ATIVOS (escutada do Firestore em tempo real)
// Lista de banners ATIVOS (escutada do Firestore em tempo real)
banners: Banner[] = [];

  // ============================================
  // CATEGORIAS
  // ============================================
  categorias = [
    'Todos', 'Entradas', 'Burgers na Brasa', 'Smash Burgers',
    'Promocoes', 'Risotos', 'Saladas', 'Monte seu Prato',
    'Sobremesas', 'Bebidas'
  ];

  // ============================================
  // CARRINHO
  // ============================================
  carrinho: any[] = [];
  mostrarCarrinho = false;

  // Configurações de delivery (vem do Firestore em tempo real)
  taxaEntrega = 5.00;
  pedidoMinimo = 0;
  tempoEstimado = 45;
  raioEntrega = 5;

  etapaCheckout: 'carrinho' | 'endereco' | 'pagamento' | 'pix' | 'sucesso' = 'carrinho';
  enderecoEntrega = '';
  formaPagamentoSelecionada = '';
  pedidoFinalizado: any = null;

  pixTimerSegundos = 600;
  pixTimerInterval: any = null;
  pixCodigoCopiaCola = '00020126580014br.gov.bcb.pix01361jhddekdjjm5204000053039865802BR5925Villa Brasa6009Sao Paulo62070503***6304ABCD';
  pixCopiado = false;

  opcoesPagamento = [
    { id: 'credito',  titulo: 'Cartão de Crédito', subtitulo: 'Visa, Mastercard, Elo, etc.', icone: 'credito' },
    { id: 'debito',   titulo: 'Cartão de Débito',  subtitulo: 'Débito online',                icone: 'debito' },
    { id: 'pix',      titulo: 'Pix',               subtitulo: 'Pagamento instantâneo',        icone: 'pix' },
    { id: 'dinheiro', titulo: 'Dinheiro',          subtitulo: 'Pagar na entrega',             icone: 'dinheiro' }
  ];

  // ============================================
  // ACOMPANHAMENTO DO PEDIDO
  // ============================================
  pedidoSelecionado: any = null;

  etapasPedido = [
    { numero: 1, titulo: 'Pedido Recebido',   descricao: 'Seu pedido foi confirmado',                 icone: '✓' },
    { numero: 2, titulo: 'Em Preparação',     descricao: 'Nossa equipe está preparando seu pedido',   icone: '📦' },
    { numero: 3, titulo: 'Pronto',            descricao: 'Seu pedido está pronto',                    icone: '🕐' },
    { numero: 4, titulo: 'Saiu para Entrega', descricao: 'Seu pedido está a caminho',                 icone: '🚚' },
    { numero: 5, titulo: 'Entregue',          descricao: 'Pedido entregue com sucesso',               icone: '📍' }
  ];

  // Etapa especial para pedidos cancelados (não faz parte do fluxo normal)
  etapaCancelado = { titulo: 'Pedido Cancelado', descricao: 'Este pedido foi cancelado', icone: '❌' };

  // ============================================
  // PERFIL
  // ============================================
  editando = false;
  alterandoSenha = false;
  perfilNome = 'Cliente Villa Brasa';
  perfilEmail = 'cliente@villabrasa.com';
  perfilTelefone = '';
  perfilCpf = '';
  perfilEndereco = '';
  senhaAtual = '';
  novaSenha = '';
  confirmarSenha = '';

  // ============================================
  // PEDIDOS (Firestore)
  // ============================================
  pedidosAtivos: any[] = [];
  pedidosHistorico: any[] = [];

  // ============================================
  // PRODUTOS (Firestore)
  // ============================================
  todosProdutos: Produto[] = [];

  // Subscriptions
  private pedidosSub: Subscription | null = null;
  private produtosSub: Subscription | null = null;
  private bannersSub: Subscription | null = null;
  private configSub: Subscription | null = null;

  // ============================================
  // LIFECYCLE
  // ============================================
  ngOnInit() {
    // Banner carrossel
    this.bannerInterval = setInterval(() => {
      if (this.banners.length > 0) {
        this.bannerAtual = (this.bannerAtual + 1) % this.banners.length;
      }
    }, 5000);

    // Escuta produtos do Firestore (só DISPONÍVEIS)
   this.produtosSub = this.produtoService.listarTodos().subscribe({
      next: (produtos) => {
        this.ngZone.run(() => {
          console.log('🔵 CUSTOMER: Produtos recebidos:', produtos.length);
          // Filtra: só disponíveis E com estoque > 0
          this.todosProdutos = [...produtos.filter(p => p.disponivel && p.estoque > 0)];
          setTimeout(() => this.cdr.detectChanges(), 0);
        });
      },
      error: (erro) => {
        console.error('🔴 CUSTOMER: ERRO ao listar produtos:', erro);
      }
    });
// Escuta banners do Firestore em tempo real
    this.bannersSub = this.bannerService.listarTodos().subscribe({
      next: (banners) => {
        this.ngZone.run(() => {
          console.log('🔵 CUSTOMER: Banners recebidos:', banners.length);
          // Filtra: só os ATIVOS, ordenados por ordem
          this.banners = [...banners.filter(b => b.ativo).sort((a, b) => a.ordem - b.ordem)];
          this.cdr.detectChanges();
        });
      },
      error: (erro) => {
        console.error('🔴 CUSTOMER: ERRO ao listar banners:', erro);
      }
    });

    // Escuta configurações de delivery em tempo real
    this.configSub = this.configuracaoService.listarConfig().subscribe({
      next: (config: ConfiguracaoDelivery | undefined) => {
        this.ngZone.run(() => {
          if (config) {
            console.log('🔵 CUSTOMER: Config recebida:', config);
            this.taxaEntrega = config.taxaEntrega ?? 5.00;
            this.pedidoMinimo = config.pedidoMinimo ?? 0;
            this.tempoEstimado = config.tempoEstimado ?? 45;
            this.raioEntrega = config.raioEntrega ?? 5;
            this.cdr.detectChanges();
          }
        });
      },
      error: (erro: any) => {
        console.error('🔴 CUSTOMER: ERRO config:', erro);
      }
    });
    // Escuta pedidos do cliente em tempo real (Firestore)
    this.pedidosSub = this.pedidoService
      .listarPorEmail('cliente@gmail.com')
      .subscribe({
        next: (pedidos) => {
          this.ngZone.run(() => {
            console.log('🔵 CUSTOMER: Recebido do Firestore:', pedidos.length, 'pedidos');

            const ativos = pedidos.filter(p =>
              ['Pendente', 'Em Preparo', 'Pronto', 'Em Entrega'].includes(p.status)
            );
            const historico = pedidos.filter(p =>
              ['Entregue', 'Finalizado', 'Cancelado'].includes(p.status)
            );

            this.pedidosAtivos = [...ativos.map(p => this.converterPedido(p))];
            this.pedidosHistorico = [...historico.map(p => this.converterPedido(p))];

           // Atualiza pedidoSelecionado se estiver vendo "Acompanhe Pedido"
            if (this.pedidoSelecionado) {
              const idAtual = this.pedidoSelecionado.id;
              const atualizado = this.pedidosAtivos.find(p => p.id === idAtual) ||
                                 this.pedidosHistorico.find(p => p.id === idAtual);

              console.log('🔄 CUSTOMER: Atualizando pedido selecionado | id:', idAtual,
                          '| encontrado:', !!atualizado,
                          '| novo status:', atualizado?.status);

              if (atualizado) {
                this.pedidoSelecionado = { ...atualizado };
              }
            }
            this.cdr.detectChanges();
          });
        },
        error: (erro) => {
          console.error('🔴 CUSTOMER: ERRO:', erro);
        }
      });
  }

  ngOnDestroy() {
    clearInterval(this.bannerInterval);
    this.pararTimerPix();
    if (this.pedidosSub) this.pedidosSub.unsubscribe();
    if (this.produtosSub) this.produtosSub.unsubscribe();
    if (this.bannersSub) this.bannersSub.unsubscribe();
    if (this.configSub) this.configSub.unsubscribe();
  }

  // Conversor: pedido Firestore → formato Customer
  private converterPedido(p: any): any {
    const mapaStatusEtapa: { [key: string]: number } = {
      'Pendente': 1, 'Em Preparo': 2, 'Pronto': 3, 'Em Entrega': 4,
      'Entregue': 5, 'Finalizado': 5, 'Cancelado': 0
    };
    const mapaStatusClass: { [key: string]: string } = {
      'Pendente': 'badge-yellow', 'Em Preparo': 'badge-blue',
      'Pronto': 'badge-green', 'Em Entrega': 'badge-blue',
      'Entregue': 'badge-green', 'Finalizado': 'badge-green',
      'Cancelado': 'badge-red'
    };

    return {
      id: p.id,
      numero: p.numero,
      hora: p.hora,
      dataCompleta: p.dataCompleta,
      tempoDecorrido: '0 min',
      etapaAtual: mapaStatusEtapa[p.status] || 1,
      formaPagamento: p.formaPagamento,
      status: p.status,
      statusClass: mapaStatusClass[p.status] || 'badge-yellow',
      total: (p.valor || 0).toFixed(2).replace('.', ','),
      itens: p.itens || []
    };
  }

  // ============================================
  // BANNER
  // ============================================
  proximoBanner() {
    if (this.banners.length > 0) {
      this.bannerAtual = (this.bannerAtual + 1) % this.banners.length;
    }
  }

  bannerAnterior() {
    if (this.banners.length > 0) {
      this.bannerAtual = (this.bannerAtual - 1 + this.banners.length) % this.banners.length;
    }
  }

  // ============================================
  // PRODUTOS (GETTERS)
  // ============================================
  get produtos(): Produto[] {
    let lista = this.todosProdutos;

    // Filtro por categoria
    if (this.categoriaSelecionada !== 'Todos') {
      lista = lista.filter(p => p.categoria === this.categoriaSelecionada);
    }

    // Filtro por busca (nome ou descrição)
    if (this.buscaProduto && this.buscaProduto.trim()) {
      const busca = this.buscaProduto.toLowerCase().trim();
      lista = lista.filter(p =>
        p.nome.toLowerCase().includes(busca) ||
        p.descricao.toLowerCase().includes(busca)
      );
    }

    return lista;
  }

  get categoriaAtual() {
    return this.categoriaSelecionada === 'Todos' ? 'Todos os Produtos' : this.categoriaSelecionada;
  }

  // ============================================
  // CARRINHO
  // ============================================
  adicionarAoCarrinho(produto: any) {
    const itemExistente = this.carrinho.find(item => item.nome === produto.nome);
    if (itemExistente) {
      itemExistente.qtd += 1;
    } else {
      this.carrinho.push({
        nome: produto.nome,
        descricao: produto.descricao,
        preco: typeof produto.preco === 'string' ? parseFloat(produto.preco) : produto.preco,
        imagem: produto.imagem,
        qtd: 1
      });
    }
  }

  diminuirQtd(item: any) {
    const itemNoCarrinho = this.carrinho.find(i => i.nome === item.nome);
    if (itemNoCarrinho && itemNoCarrinho.qtd > 1) itemNoCarrinho.qtd -= 1;
  }

  aumentarQtd(item: any) {
    const itemNoCarrinho = this.carrinho.find(i => i.nome === item.nome);
    if (itemNoCarrinho) itemNoCarrinho.qtd += 1;
  }

  excluirItem(item: any) {
    this.carrinho = this.carrinho.filter(i => i.nome !== item.nome);
  }

  get totalCarrinho(): number {
    return this.carrinho.reduce((soma, item) => soma + (item.preco * item.qtd), 0);
  }

  get totalGeralCarrinho(): number { return this.totalCarrinho + this.taxaEntrega; }

  get quantidadeTotalCarrinho(): number {
    return this.carrinho.reduce((soma, item) => soma + item.qtd, 0);
  }

  toggleCarrinho() {
    this.mostrarCarrinho = !this.mostrarCarrinho;
    if (!this.mostrarCarrinho) {
      this.etapaCheckout = 'carrinho';
      this.pararTimerPix();
    }
  }

  // ============================================
  // CHECKOUT
  // ============================================
  irParaEndereco() {
    if (this.carrinho.length === 0) {
      alert('Adicione itens ao carrinho antes de finalizar!');
      return;
    }
    this.etapaCheckout = 'endereco';
  }
  // ============================================
  // BUSCA DE CEP (ViaCEP - endereços reais)
  // ============================================
  cepBusca = '';
  numeroEndereco = '';
  complementoEndereco = '';
  statusCep = '';
  cepErro = false;
  cepBuscando = false;
  cepEncontrado = false;
  private dadosCep: any = null;

  formatarCep() {
    let v = this.cepBusca.replace(/\D/g, '').slice(0, 8);
    if (v.length > 5) v = v.slice(0, 5) + '-' + v.slice(5);
    this.cepBusca = v;
    this.cepEncontrado = false;
    if (v.replace(/\D/g, '').length === 8) {
      this.buscarCep();
    }
  }

  async buscarCep() {
    const limpo = this.cepBusca.replace(/\D/g, '');
    if (limpo.length !== 8) return;

    this.ngZone.run(() => {
      this.cepBuscando = true;
      this.cepEncontrado = false;
      this.statusCep = '';
      this.cepErro = false;
      this.cdr.detectChanges();
    });

    try {
      const resp = await fetch(`https://viacep.com.br/ws/${limpo}/json/`);
      const json = await resp.json();

      this.ngZone.run(() => {
        this.cepBuscando = false;

        if (json.erro) {
          this.statusCep = 'CEP não encontrado. Confira o número.';
          this.cepErro = true;
          this.dadosCep = null;
        } else {
          this.dadosCep = json;
          this.montarEndereco();
          this.cepEncontrado = true;
          this.statusCep = 'Endereço encontrado! Agora informe o número.';
          this.cepErro = false;
        }
        this.cdr.detectChanges();
      });
    } catch (erro) {
      console.error('Erro ao buscar CEP:', erro);
      this.ngZone.run(() => {
        this.cepBuscando = false;
        this.statusCep = 'Erro ao buscar. Verifique a conexão.';
        this.cepErro = true;
        this.cdr.detectChanges();
      });
    }
  }
  montarEndereco() {
    if (!this.dadosCep) return;
    const partes: string[] = [];
    let rua = this.dadosCep.logradouro || '';
    if (this.numeroEndereco.trim()) rua += ', ' + this.numeroEndereco.trim();
    partes.push(rua);
    if (this.complementoEndereco.trim()) partes.push(this.complementoEndereco.trim());
    if (this.dadosCep.bairro) partes.push(this.dadosCep.bairro);
    partes.push(`${this.dadosCep.localidade || ''} - ${this.dadosCep.uf || ''}`);
    this.enderecoEntrega = partes.filter(p => p && p.trim()).join(', ');
  }
  irParaPagamento() {
    if (!this.enderecoEntrega || this.enderecoEntrega.trim().length < 10) {
      alert('Por favor, preencha o endereço completo!');
      return;
    }
    this.etapaCheckout = 'pagamento';
  }

  voltarEtapa() {
    if (this.etapaCheckout === 'pagamento') this.etapaCheckout = 'endereco';
    else if (this.etapaCheckout === 'endereco') this.etapaCheckout = 'carrinho';
  }

  selecionarPagamento(idPagamento: string) {
    this.formaPagamentoSelecionada = idPagamento;
  }

  confirmarPedido() {
    if (!this.formaPagamentoSelecionada) {
      alert('Selecione uma forma de pagamento!');
      return;
    }
    if (this.formaPagamentoSelecionada === 'pix') {
      this.etapaCheckout = 'pix';
      this.iniciarTimerPix();
      return;
    }
    this.criarPedidoEFinalizar();
  }

  async criarPedidoEFinalizar() {
    const numeroPedido = 'ORD-' + String(Date.now()).slice(-3);

    const novoPedido = {
      numero: numeroPedido,
      cliente: 'Cliente',
      email: 'cliente@gmail.com',
      hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      dataCompleta: new Date().toLocaleDateString('pt-BR') + ', ' +
                    new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      formaPagamento: this.getNomePagamento(this.formaPagamentoSelecionada),
      endereco: this.enderecoEntrega,
      status: 'Pendente',
      valor: this.totalGeralCarrinho,
      itens: this.carrinho.map(item => ({
        qtd: item.qtd,
        nome: item.nome,
        valor: (item.preco * item.qtd).toFixed(2).replace('.', ',')
      })),
      observacoes: ''
    };

    try {
      const idGerado = await this.pedidoService.criarPedido(novoPedido as any);
      const pedidoLocal: any = {
        ...novoPedido,
        id: idGerado,
        tempoDecorrido: '0 min',
        etapaAtual: 1,
        statusClass: 'badge-yellow',
        total: this.totalGeralCarrinho.toFixed(2).replace('.', ',')
      };
      this.pedidoFinalizado = pedidoLocal;
      this.etapaCheckout = 'sucesso';
    } catch (erro) {
      console.error('Erro ao salvar pedido no Firestore:', erro);
      alert('❌ Erro ao enviar pedido. Verifique sua conexão e tente novamente.');
    }
  }

  getNomePagamento(id: string): string {
    const opcao = this.opcoesPagamento.find(o => o.id === id);
    return opcao ? opcao.titulo : '';
  }

  fecharCheckoutSucesso() {
    this.pararTimerPix();
    this.carrinho = [];
    this.mostrarCarrinho = false;
    this.etapaCheckout = 'carrinho';
    this.enderecoEntrega = '';
    this.formaPagamentoSelecionada = '';
    this.pedidoFinalizado = null;
    this.aba = 'pedidos';
  }

  // ============================================
  // PIX
  // ============================================
  iniciarTimerPix() {
    this.pixTimerSegundos = 600;
    if (this.pixTimerInterval) clearInterval(this.pixTimerInterval);
    this.pixTimerInterval = setInterval(() => {
      if (this.pixTimerSegundos > 0) {
        this.pixTimerSegundos -= 1;
      } else {
        this.cancelarPix();
        alert('O tempo para pagamento expirou. Tente novamente.');
      }
    }, 1000);
  }

  get pixTimerFormatado(): string {
    const minutos = Math.floor(this.pixTimerSegundos / 60);
    const segundos = this.pixTimerSegundos % 60;
    return `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
  }

  copiarCodigoPix() {
    navigator.clipboard.writeText(this.pixCodigoCopiaCola).then(() => {
      this.pixCopiado = true;
      setTimeout(() => this.pixCopiado = false, 2000);
    }).catch(() => {
      alert('Não foi possível copiar. Tente selecionar manualmente.');
    });
  }

  confirmarPagamentoPix() {
    this.pararTimerPix();
    this.criarPedidoEFinalizar();
  }

  cancelarPix() {
    this.pararTimerPix();
    this.etapaCheckout = 'pagamento';
  }

  pararTimerPix() {
    if (this.pixTimerInterval) {
      clearInterval(this.pixTimerInterval);
      this.pixTimerInterval = null;
    }
  }

  // ============================================
  // ACOMPANHAMENTO
  // ============================================
  acompanharPedido(pedido: any) { this.pedidoSelecionado = pedido; }
  voltarParaPedidos() { this.pedidoSelecionado = null; }

  
  getStatusEtapa(numeroEtapa: number): string {
    if (!this.pedidoSelecionado) return 'pendente';
    if (numeroEtapa < this.pedidoSelecionado.etapaAtual) return 'concluida';
    if (numeroEtapa === this.pedidoSelecionado.etapaAtual) return 'atual';
    return 'pendente';
  }

  // Verifica se o pedido foi cancelado (pra mostrar tela diferente)
  get pedidoFoiCancelado(): boolean {
    return this.pedidoSelecionado?.status === 'Cancelado';
  }
 // Verifica se o pedido AINDA pode ser cancelado pelo cliente
  get podeCancelar(): boolean {
    if (!this.pedidoSelecionado) return false;
    // Permite cancelar em qualquer etapa, EXCETO se já foi finalizado/cancelado
    return !['Entregue', 'Finalizado', 'Cancelado'].includes(this.pedidoSelecionado.status);
  }
  // ============================================
  // ============================================
  // CHAT COM O ENTREGADOR (real, via Firestore)
  // ============================================
  chatAberto = false;
  mensagemDigitada = '';
  mensagensChat: any[] = [];
  private mensagensSub: Subscription | null = null;

  respostasRapidas = [
    { emoji: '📍', texto: 'Onde você está?' },
    { emoji: '🏠', texto: 'Pode deixar na portaria' },
    { emoji: '⏱️', texto: 'Quanto tempo falta?' }
  ];

  // Só pode falar com o motoboy quando o pedido está a caminho
  get podeFalarComEntregador(): boolean {
    return this.pedidoSelecionado?.status === 'Em Entrega';
  }

  abrirChat() {
    if (!this.pedidoSelecionado) return;
    this.chatAberto = true;

    // ID do pedido no Firestore (mesmo que o motoboy usa pra escutar)
    const pedidoId = this.pedidoSelecionado.id;

    // Começa a escutar as mensagens DESTE pedido em tempo real
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
    // Para de escutar (libera o "ouvinte" do Firestore)
    if (this.mensagensSub) {
      this.mensagensSub.unsubscribe();
      this.mensagensSub = null;
    }
  }

  async enviarMensagem() {
    const texto = this.mensagemDigitada.trim();
    if (!texto || !this.pedidoSelecionado) return;

    const pedidoId = this.pedidoSelecionado.id;
    this.mensagemDigitada = ''; // limpa o input na hora (UX)

    try {
      // Grava no Firestore como 'cliente' — o motoboy vai receber em tempo real
      await this.mensagemService.enviar(pedidoId, 'cliente', texto);
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

  // Cliente cancela o próprio pedido (grava no Firestore)
  async cancelarMeuPedido() {
    if (!this.pedidoSelecionado) return;

    const confirmar = confirm(
      `Tem certeza que deseja cancelar o pedido #${this.pedidoSelecionado.numero || this.pedidoSelecionado.id}?\n\n` +
      'Esta ação não pode ser desfeita.'
    );
    if (!confirmar) return;

    try {
      // Grava no Firestore com status Cancelado + motivo
      await this.pedidoService.cancelarEntrega(
        this.pedidoSelecionado.id,
        'Cancelado pelo cliente',
        ''
      );
      alert('✅ Pedido cancelado com sucesso.');
      // O Firestore vai atualizar a tela automaticamente (tempo real)
    } catch (erro) {
      console.error('Erro ao cancelar pedido:', erro);
      alert('❌ Erro ao cancelar. Tente novamente.');
    }
  }
  // ============================================
  // PERFIL
  // ============================================
  salvarPerfil() { this.editando = false; }

  alterarSenha() {
    if (this.novaSenha === this.confirmarSenha) {
      alert('Senha alterada com sucesso!');
      this.alterandoSenha = false;
      this.senhaAtual = '';
      this.novaSenha = '';
      this.confirmarSenha = '';
    } else {
      alert('As senhas nao conferem!');
    }
  }

  // ============================================
  // SAIR
  // ============================================
  sairConta() {
    const confirmar = confirm('Tem certeza que deseja sair da sua conta?');
    if (confirmar) this.router.navigate(['/login']);
  }
}