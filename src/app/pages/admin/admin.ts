import { Component, OnInit, OnDestroy, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BannerService, Banner } from '../../services/banner.service';
import { PedidoService } from '../../services/pedido.service';
import { ProdutoService, Produto } from '../../services/produto.service';
import { ConfiguracaoService, ConfiguracaoDelivery } from '../../services/configuracao.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-admin',
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.html',
  styleUrl: './admin.css'
})
export class Admin implements OnInit, OnDestroy {

  constructor(
    private router: Router,
    private bannerService: BannerService,
    private pedidoService: PedidoService,
    private produtoService: ProdutoService,
    private configuracaoService: ConfiguracaoService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  // Subscriptions
 private pedidosSub: Subscription | null = null;
  private produtosSub: Subscription | null = null;
  private bannersSub: Subscription | null = null;
  private configSub: Subscription | null = null;

  // Lista de produtos (vem do Firestore em tempo real)
  produtos: Produto[] = [];

  ngOnInit() {
    // Escuta produtos do Firestore em tempo real
    this.produtosSub = this.produtoService.listarTodos().subscribe({
      next: (produtos) => {
        this.ngZone.run(() => {
          console.log('🔵 ADMIN: Produtos recebidos do Firestore:', produtos.length);
          // Garante diasDisponiveis em todos
          const todosDias = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
          this.produtos = produtos.map(p => ({
            ...p,
            diasDisponiveis: p.diasDisponiveis || [...todosDias]
          }));
          setTimeout(() => this.cdr.detectChanges(), 0);
        });
      },
      error: (erro) => {
        console.error('🔴 ADMIN: ERRO ao listar produtos:', erro);
      }
    });
    // Escuta banners do Firestore em tempo real
// Escuta banners do Firestore em tempo real
    this.bannersSub = this.bannerService.listarTodos().subscribe({
      next: (banners) => {
        this.ngZone.run(() => {
          console.log('🔵 ADMIN: Banners recebidos:', banners.length);
          this.banners = [...banners];
          this.cdr.detectChanges();
        });
      },
      error: (erro) => {
        console.error('🔴 ADMIN: ERRO ao listar banners:', erro);
      }
    });
// Escuta configurações de delivery do Firestore
    this.configSub = this.configuracaoService.listarConfig().subscribe({
      next: (config: ConfiguracaoDelivery | undefined) => {
        this.ngZone.run(() => {
          if (config) {
            console.log('🔵 ADMIN: Config recebida:', config);
            this.configTaxaEntrega = config.taxaEntrega ?? 0;
            this.configPedidoMinimo = config.pedidoMinimo ?? 0;
            this.configTempoEstimado = config.tempoEstimado ?? 45;
            this.configRaioEntrega = config.raioEntrega ?? 5;
            this.cdr.detectChanges();
          }
        });
      },
      error: (erro: any) => {
        console.error('🔴 ADMIN: ERRO config:', erro);
      }
    });
    // Escuta TODOS os pedidos do Firestore em tempo real
    this.pedidosSub = this.pedidoService.listarTodos().subscribe({
      next: (pedidos) => {
        this.ngZone.run(() => {
          console.log('🔵 ADMIN: Recebido do Firestore:', pedidos.length, 'pedidos');
          this.pedidosRecentes = [...pedidos.map(p => this.converterPedido(p))];
          this.cdr.detectChanges();
        });
      },
      error: (erro) => {
        console.error('🔴 ADMIN: ERRO ao listar pedidos:', erro);
      }
    });
  }

  ngOnDestroy() {
    if (this.pedidosSub) this.pedidosSub.unsubscribe();
    if (this.produtosSub) this.produtosSub.unsubscribe();
    if (this.bannersSub) this.bannersSub.unsubscribe();
    if (this.configSub) this.configSub.unsubscribe();
    this.motoboys.forEach(m => {
      if (m.timerTempoFora) clearInterval(m.timerTempoFora);
      if (m.timerFinalizacao) clearTimeout(m.timerFinalizacao);
    });
  }

  // BOTÃO TEMPORÁRIO: popula 39 produtos no Firestore
  async popularFirestore() {
    if (this.produtos.length > 0) {
      if (!confirm('Já existem produtos no Firestore. Adicionar mais 39?')) return;
    }
    try {
      await this.produtoService.popularProdutosPadrao();
      alert('✅ Produtos populados no Firestore!');
    } catch (erro) {
      console.error('Erro ao popular:', erro);
      alert('Erro ao popular. Veja o console.');
    }
  }

  // ============================================
  // CONVERSOR: pedido Firestore → formato Admin
  // ============================================
  private converterPedido(p: any): any {
    const valorNum = typeof p.valor === 'string'
      ? parseFloat(p.valor.replace(',', '.'))
      : (p.valor || 0);

    return {
      id: p.id,
      numero: p.numero,
      cliente: p.cliente || 'Cliente',
      email: p.email || '',
      hora: p.hora || '',
      dataCompleta: p.dataCompleta || '',
      valor: valorNum,
      formaPagamento: p.formaPagamento || '',
      status: p.status || 'Pendente',
      statusClass: this.getStatusClass(p.status || 'Pendente'),
      expandido: false,
      itens: (p.itens || []).map((item: any) => ({
        qtd: item.qtd,
        nome: item.nome,
        valor: typeof item.valor === 'string'
          ? parseFloat(item.valor.replace(',', '.'))
          : (item.valor || 0)
      })),
      endereco: p.endereco || '',
      observacoes: p.observacoes || '',
      motoboyId: p.motoboyId || null,
      motoboyNome: p.motoboyNome || null
    };
  }

  // ============================================
  // NAVEGAÇÃO DA SIDEBAR
  // ============================================
  abaSidebar = 'dashboard'

  // ============================================
  // DASHBOARD
  // ============================================
  variacaoReceita = 12;

  get receitaHoje(): number {
    return this.pedidosRecentes
      .filter(p => p.status !== 'Cancelado')
      .reduce((soma, p) => soma + (p.valor || 0), 0);
  }
  
  // Receita perdida (soma dos pedidos cancelados) - tempo real
  get receitaCancelada(): number {
    return this.pedidosRecentes
      .filter(p => p.status === 'Cancelado')
      .reduce((soma, p) => soma + (p.valor || 0), 0);
  }

  // Quantidade de pedidos cancelados
  get totalCancelados(): number {
    return this.pedidosRecentes.filter(p => p.status === 'Cancelado').length;
  }

  get pedidosHoje(): number { return this.pedidosRecentes.length; }

  pedidosRecentes: any[] = [];

  // Só os 6 pedidos mais recentes (pra mostrar no Dashboard)
  get pedidosRecentesTop6(): any[] {
    return this.pedidosRecentes.slice(0, 6);
  }

  get pedidosEmPreparacao(): number {
    return this.pedidosRecentes.filter(p => p.status === 'Em Preparo').length;
  }

  // ============================================
  // ABA PEDIDOS
  // ============================================
  filtroStatusPedido = 'Todos';
  statusDisponiveis = ['Todos', 'Pendente', 'Em Preparo', 'Pronto', 'Em Entrega', 'Entregue', 'Finalizado', 'Cancelado'];
  statusOpcoes = ['Pendente', 'Em Preparo', 'Pronto', 'Em Entrega', 'Entregue', 'Finalizado', 'Cancelado'];

  get pedidosFiltrados() {
    if (this.filtroStatusPedido === 'Todos') return this.pedidosRecentes;
    return this.pedidosRecentes.filter(p => p.status === this.filtroStatusPedido);
  }

  get totalPedidosCount(): number { return this.pedidosRecentes.length; }
  get pedidosPendentesCount(): number { return this.pedidosRecentes.filter(p => p.status === 'Pendente').length; }
  get pedidosEmPreparoCount(): number { return this.pedidosRecentes.filter(p => p.status === 'Em Preparo').length; }
  get pedidosFinalizadosCount(): number {
    return this.pedidosRecentes.filter(p => p.status === 'Finalizado' || p.status === 'Entregue').length;
  }

  async alterarStatusPedido(pedido: any, novoStatus: string) {
    try {
      await this.pedidoService.atualizarStatus(pedido.id, novoStatus);
    } catch (erro) {
      console.error('Erro ao atualizar status:', erro);
      alert('Erro ao alterar status. Tente novamente.');
    }
  }

  getStatusClass(status: string): string {
    const map: { [key: string]: string } = {
      'Pendente': 'st-pendente',
      'Em Preparo': 'st-preparo',
      'Pronto': 'st-pronto',
      'Em Entrega': 'st-entrega',
      'Entregue': 'st-entregue',
      'Finalizado': 'st-finalizado',
      'Cancelado': 'st-cancelado'
    };
    return map[status] || 'st-pendente';
  }

  toggleExpandirPedido(pedido: any) { pedido.expandido = !pedido.expandido; }

  totalItensPedido(pedido: any): number {
    return pedido.itens.reduce((soma: number, item: any) => soma + item.valor, 0);
  }

  // Top produtos mais vendidos (calculado dos pedidos reais)
get produtosMaisVendidos(): any[] {
    // Agrupa por nome do produto, somando quantidades e valor
    const mapaProdutos: { [nome: string]: { vendidos: number; receita: number } } = {};

    // Considera apenas pedidos NÃO cancelados
    this.pedidosRecentes
      .filter(p => p.status !== 'Cancelado')
      .forEach(pedido => {
        (pedido.itens || []).forEach((item: any) => {
          const nome = item.nome;
          if (!nome) return;

          // qtd e valor (já convertidos no converterPedido)
          const qtd = item.qtd || 1;
          const valor = item.valor || 0;

          if (!mapaProdutos[nome]) {
            mapaProdutos[nome] = { vendidos: 0, receita: 0 };
          }
          mapaProdutos[nome].vendidos += qtd;
          mapaProdutos[nome].receita += valor;
        });
      });

    // Converte em array e ordena por quantidade vendida
    const lista = Object.keys(mapaProdutos).map(nome => ({
      nome,
      categoria: this.categoriaProduto(nome),
      vendidos: mapaProdutos[nome].vendidos,
      receita: mapaProdutos[nome].receita,
      posicao: 0
    }));

    // Ordena do mais vendido pro menos vendido
    lista.sort((a, b) => b.vendidos - a.vendidos);

    // Atribui posições (1, 2, 3) e pega top 3
    return lista.slice(0, 3).map((item, idx) => ({
      ...item,
      posicao: idx + 1
    }));
  }

  // ============================================
  // FILTROS / BUSCA
  // ============================================
  buscaProduto = '';
  categoriaFiltro = 'Todas';

  categorias = [
    'Todas', 'Entradas', 'Burgers na Brasa', 'Smash Burgers',
    'Promocoes', 'Risotos', 'Saladas', 'Monte seu Prato',
    'Sobremesas', 'Bebidas'
  ];

  // ============================================
  // MODAL PRODUTO
  // ============================================
  modalAberto = false;
  modoEdicao = false;
  produtoEditando: Produto | null = null;

  formNome = '';
  formDescricao = '';
  formPreco: number | null = 0;
  formCategoria = 'Entradas';
  formImagem = '';
  formEstoque: number | null = 10;
  formStatus = 'Disponível';

  get produtosFiltrados(): Produto[] {
    let lista = this.produtos;
    if (this.categoriaFiltro !== 'Todas') {
      lista = lista.filter(p => p.categoria === this.categoriaFiltro);
    }
    if (this.buscaProduto.trim()) {
      const busca = this.buscaProduto.toLowerCase();
      lista = lista.filter(p =>
        p.nome.toLowerCase().includes(busca) ||
        p.descricao.toLowerCase().includes(busca)
      );
    }
    return lista;
  }

  classificarEstoque(qtd: number): string {
    if (qtd === 0) return 'sem-estoque';
    if (qtd < 10) return 'estoque-baixo';
    return 'em-estoque';
  }

  textoEstoque(qtd: number): string {
    if (qtd === 0) return 'Sem Estoque';
    if (qtd < 10) return 'Estoque Baixo';
    return 'Em Estoque';
  }

  get produtosEstoqueBaixo(): Produto[] {
    return this.produtos
      .filter((p: Produto) => p.estoque < 10)
      .sort((a: Produto, b: Produto) => a.estoque - b.estoque)
      .slice(0, 5);
  }

  get totalEstoqueBaixo(): number { return this.produtos.filter((p: Produto) => p.estoque < 10).length; }
  get totalItens(): number { return this.produtos.length; }
  get totalItensAtivos(): number { return this.produtos.filter((p: Produto) => p.disponivel).length; }
  get totalItensInativos(): number { return this.produtos.filter((p: Produto) => !p.disponivel).length; }

  get totalCategorias(): number {
    const cats = new Set(this.produtos.map((p: Produto) => p.categoria));
    return cats.size;
  }

  // ============================================
  // CATEGORIAS
  // ============================================
  get listaCategoriasComStats() {
    const categoriasUnicas = this.categorias.filter(c => c !== 'Todas');
    return categoriasUnicas.map(cat => {
      const produtosDaCategoria = this.produtos.filter((p: Produto) => p.categoria === cat);
      const ativos = produtosDaCategoria.filter((p: Produto) => p.disponivel).length;
      return { nome: cat, totalItens: produtosDaCategoria.length, ativos };
    });
  }

  categoriaSelecionada: string | null = null;
  modalDiasAberto = false;
  produtoEditandoDias: Produto | null = null;
  todosOsDias = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
  diasFormulario: string[] = [];
  disponivelFormulario = true;

  abrirCategoria(categoria: string) { this.categoriaSelecionada = categoria; }
  voltarParaGridCategorias() { this.categoriaSelecionada = null; }

  get produtosDaCategoriaSelecionada(): Produto[] {
    if (!this.categoriaSelecionada) return [];
    return this.produtos.filter((p: Produto) => p.categoria === this.categoriaSelecionada);
  }

  get statsCategoriaSelecionada() {
    const lista = this.produtosDaCategoriaSelecionada;
    return { total: lista.length, ativos: lista.filter((p: Produto) => p.disponivel).length };
  }

  diaMarcado(produto: Produto, dia: string): boolean {
    return !!(produto.diasDisponiveis && produto.diasDisponiveis.includes(dia));
  }

  abrirModalDias(produto: Produto) {
    this.produtoEditandoDias = produto;
    this.diasFormulario = [...(produto.diasDisponiveis || [])];
    this.disponivelFormulario = produto.disponivel;
    this.modalDiasAberto = true;
  }

  fecharModalDias() {
    this.modalDiasAberto = false;
    this.produtoEditandoDias = null;
    this.diasFormulario = [];
  }

  toggleDiaFormulario(dia: string) {
    if (this.diasFormulario.includes(dia)) {
      this.diasFormulario = this.diasFormulario.filter(d => d !== dia);
    } else {
      this.diasFormulario.push(dia);
    }
  }

  async salvarDias() {
    if (this.produtoEditandoDias && this.produtoEditandoDias.id) {
      try {
        await this.produtoService.atualizar(this.produtoEditandoDias.id, {
          diasDisponiveis: [...this.diasFormulario],
          disponivel: this.disponivelFormulario
        });
        this.fecharModalDias();
      } catch (erro) {
        console.error('Erro ao salvar dias:', erro);
        alert('Erro ao salvar. Tente novamente.');
      }
    }
  }

  // Helper: remove acentos, espaços extras e converte pra minúsculo
  private normalizarTexto(texto: string): string {
    return texto
      .trim()
      .toLowerCase()
      .normalize('NFD')                    // separa letra do acento
      .replace(/[\u0300-\u036f]/g, '');    // remove os acentos
  }

  imagemProduto(nome: string): string {
    if (!nome) return 'https://i.pinimg.com/736x/c8/4a/33/c84a335905a212e0a36983b3ebfd8010.jpg';
    const nomeNormalizado = this.normalizarTexto(nome);
    const p = this.produtos.find((prod: Produto) =>
      prod.nome && this.normalizarTexto(prod.nome) === nomeNormalizado
    );
    return p ? p.imagem : 'https://i.pinimg.com/736x/c8/4a/33/c84a335905a212e0a36983b3ebfd8010.jpg';
  }

  categoriaProduto(nome: string): string {
    if (!nome) return '';
    const nomeNormalizado = this.normalizarTexto(nome);
    const p = this.produtos.find((prod: Produto) =>
      prod.nome && this.normalizarTexto(prod.nome) === nomeNormalizado
    );
    return p ? p.categoria : '';
  }

  // ============================================
  // BANNERS
  // ============================================
  // Lista de banners (vem do Firestore em tempo real)
banners: Banner[] = [];

  get bannersOrdenados(): Banner[] {
    return [...this.banners].sort((a, b) => a.ordem - b.ordem);
  }

  get bannersAtivosPreview(): Banner[] {
    return this.banners.filter(b => b.ativo).sort((a, b) => a.ordem - b.ordem);
  }

  indicePreviewBanner = 0;

  get bannerAtualPreview(): Banner | null {
    const ativos = this.bannersAtivosPreview;
    if (ativos.length === 0) return null;
    return ativos[this.indicePreviewBanner % ativos.length];
  }

  proximoPreviewBanner() {
    if (this.bannersAtivosPreview.length > 0) {
      this.indicePreviewBanner = (this.indicePreviewBanner + 1) % this.bannersAtivosPreview.length;
    }
  }

  anteriorPreviewBanner() {
    const total = this.bannersAtivosPreview.length;
    if (total > 0) {
      this.indicePreviewBanner = (this.indicePreviewBanner - 1 + total) % total;
    }
  }

  irParaPreviewBanner(indice: number) { this.indicePreviewBanner = indice; }

  modalBannerAberto = false;
  modoEdicaoBanner = false;
  bannerEditandoId: string | null = null;

  formBannerTitulo = '';
  formBannerSubtitulo = '';
  formBannerTextoBotao = '';
  formBannerImagem = '';
  formBannerCta = '';
  formBannerOrdem: number = 1;
  formBannerAtivo = true;

  abrirModalNovoBanner() {
    this.modoEdicaoBanner = false;
    this.bannerEditandoId = null;
    this.formBannerTitulo = '';
    this.formBannerSubtitulo = '';
    this.formBannerTextoBotao = '';
    this.formBannerImagem = '';
    this.formBannerCta = '';
    this.formBannerOrdem = this.bannersOrdenados.length + 1;
    this.formBannerAtivo = true;
    this.modalBannerAberto = true;
  }

  abrirModalEditarBanner(banner: Banner) {
    this.modoEdicaoBanner = true;
    this.bannerEditandoId = banner.id || null;
    this.formBannerTitulo = banner.titulo;
    this.formBannerSubtitulo = banner.subtitulo;
    this.formBannerTextoBotao = banner.textoBotao;
    this.formBannerImagem = banner.imagem;
    this.formBannerCta = banner.cta;
    this.formBannerOrdem = banner.ordem;
    this.formBannerAtivo = banner.ativo;
    this.modalBannerAberto = true;
  }

  fecharModalBanner() {
    this.modalBannerAberto = false;
    this.bannerEditandoId = null;
  }

  async salvarBanner() {
    if (!this.formBannerTitulo.trim() || !this.formBannerSubtitulo.trim()) {
      alert('Preencha o título e o subtítulo do banner!');
      return;
    }

    const imagemFinal = this.formBannerImagem || 'https://i.pinimg.com/736x/c8/4a/33/c84a335905a212e0a36983b3ebfd8010.jpg';

    try {
      if (this.modoEdicaoBanner && this.bannerEditandoId !== null) {
        await this.bannerService.atualizar(this.bannerEditandoId, {
          titulo: this.formBannerTitulo,
          subtitulo: this.formBannerSubtitulo,
          textoBotao: this.formBannerTextoBotao,
          imagem: imagemFinal,
          cta: this.formBannerCta,
          ordem: this.formBannerOrdem,
          ativo: this.formBannerAtivo
        });
      } else {
        await this.bannerService.adicionar({
          titulo: this.formBannerTitulo,
          subtitulo: this.formBannerSubtitulo,
          textoBotao: this.formBannerTextoBotao,
          imagem: imagemFinal,
          cta: this.formBannerCta,
          ordem: this.formBannerOrdem,
          ativo: this.formBannerAtivo
        });
      }
      this.fecharModalBanner();
    } catch (erro) {
      console.error('Erro ao salvar banner:', erro);
      alert('Erro ao salvar. Tente novamente.');
    }
  }

  async toggleBannerAtivo(banner: Banner) {
    if (banner.id) {
      await this.bannerService.toggleAtivo(banner.id);
    }
  }

  async excluirBanner(banner: Banner) {
    if (confirm(`Excluir o banner "${banner.titulo}"?`)) {
      if (banner.id) {
        await this.bannerService.excluir(banner.id);
      }
    }
  }

  // ============================================
  // CONFIGURAÇÕES
  // ============================================
  configNome = 'Villa Brasa';
  configDescricao = 'Hamburgueria Artesanal Premium';
  configTelefone = '(11) 98765-4321';
  configEmail = 'contato@villabrasa.com.br';
  configEndereco = 'Rua das Brasas, 123 - São Paulo, SP';
  configHorario = 'Seg-Dom: 18:00 - 23:00';

  notifNovosPedidos = true;
  notifPedidosProntos = true;
  notifEstoqueBaixo = false;

  configTaxaEntrega: number = 0;
  configPedidoMinimo: number = 0;
  configTempoEstimado: number = 45;
  configRaioEntrega: number = 5;

 async salvarConfiguracoes() {
    try {
      await this.configuracaoService.salvarConfig({
        taxaEntrega: Number(this.configTaxaEntrega) || 0,
        pedidoMinimo: Number(this.configPedidoMinimo) || 0,
        tempoEstimado: Number(this.configTempoEstimado) || 45,
        raioEntrega: Number(this.configRaioEntrega) || 5
      });
      alert('✅ Configurações salvas com sucesso!');
    } catch (erro) {
      console.error('Erro ao salvar config:', erro);
      alert('Erro ao salvar configurações. Tente novamente.');
    }
  }

  // ============================================
  // MOTOBOYS
  // ============================================
  motoboys: any[] = [
    { id: 'motoboy-fixo', nome: 'Motoboy Villa Brasa', inicial: 'M', corAvatar: '#dbeafe', entregasHoje: 8, status: 'Disponível', localizacao: 'Na loja', tempoFora: null, prontoParaAceitar: true, pedidoAtual: null, timerTempoFora: null, timerFinalizacao: null },
    { id: 'motoboy-2', nome: 'Carlos Silva', inicial: 'C', corAvatar: '#ffedd5', entregasHoje: 6, status: 'Em Entrega', localizacao: 'Rua Augusta', tempoFora: 12, prontoParaAceitar: false, pedidoAtual: null, timerTempoFora: null, timerFinalizacao: null },
    { id: 'motoboy-3', nome: 'João Santos', inicial: 'J', corAvatar: '#dcfce7', entregasHoje: 7, status: 'Em Entrega', localizacao: 'Av. Paulista', tempoFora: 25, prontoParaAceitar: false, pedidoAtual: null, timerTempoFora: null, timerFinalizacao: null },
    { id: 'motoboy-4', nome: 'Pedro Oliveira', inicial: 'P', corAvatar: '#f3e8ff', entregasHoje: 5, status: 'Disponível', localizacao: 'Na loja', tempoFora: null, prontoParaAceitar: true, pedidoAtual: null, timerTempoFora: null, timerFinalizacao: null },
    { id: 'motoboy-5', nome: 'Lucas Costa', inicial: 'L', corAvatar: '#fee2e2', entregasHoje: 4, status: 'Offline', localizacao: '', tempoFora: null, prontoParaAceitar: false, pedidoAtual: null, timerTempoFora: null, timerFinalizacao: null }
  ];
  filtroStatusMotoboy = 'Todos';
  buscaMotoboy = '';
  statusMotoboyDisponiveis = ['Todos', 'Disponível', 'Em Entrega', 'Offline'];

  // Calcula status dos motoboys baseado nos pedidos reais do Firestore


  // Calcula status dos motoboys baseado nos pedidos reais do Firestore
get motoboysComStatusReal(): any[] {
    return this.motoboys.map(m => {
      // Conta pedidos "Em Entrega" atribuídos a esse motoboy
      const pedidosAtivos = this.pedidosRecentes.filter(
        p => p.motoboyId === m.id && p.status === 'Em Entrega'
      );

      // DEBUG: mostra o que o getter está vendo (REMOVER DEPOIS)
      if (m.id === 'motoboy-fixo') {
        console.log('🟡 DEBUG motoboy-fixo | pedidos com motoboyId match:',
          this.pedidosRecentes.filter(p => p.motoboyId === m.id).length,
          '| status deles:',
          this.pedidosRecentes.filter(p => p.motoboyId === m.id).map(p => p.status));
      }

      // Conta pedidos "Entregue" hoje (pra estatística "entregasHoje")
      const entreguesHoje = this.pedidosRecentes.filter(
        p => p.motoboyId === m.id && (p.status === 'Entregue' || p.status === 'Finalizado')
      ).length;

      // Define status: se tem pedido ativo, está "Em Entrega"; senão, "Disponível"
      // (mantém "Offline" se já estava offline)
      let statusReal = m.status;
      if (m.status !== 'Offline') {
        statusReal = pedidosAtivos.length > 0 ? 'Em Entrega' : 'Disponível';
      }

      return {
        ...m,
        status: statusReal,
        entregasHoje: entreguesHoje,
        pedidoAtual: pedidosAtivos.length > 0 ? pedidosAtivos[0].id : null,
        localizacao: pedidosAtivos.length > 0
          ? ((pedidosAtivos[0].endereco || '').split('-')[0].trim() || 'A caminho')
          : 'Na loja',
        // Calcula prontoParaAceitar dinâmicamente baseado no status real
        prontoParaAceitar: statusReal === 'Disponível'
      };
    });
  }

  get motoboysFiltrados() {
    let lista = this.motoboysComStatusReal;  // Usa a versão dinâmica
    if (this.filtroStatusMotoboy !== 'Todos') {
      lista = lista.filter(m => m.status === this.filtroStatusMotoboy);
    }
    if (this.buscaMotoboy.trim()) {
      const busca = this.buscaMotoboy.toLowerCase();
      lista = lista.filter(m => m.nome.toLowerCase().includes(busca));
    }
    return lista;
  }

get totalMotoboysDisponiveis(): number {
    return this.motoboysComStatusReal.filter(m => m.status === 'Disponível').length;
  }
  get totalMotoboysEmEntrega(): number {
    return this.motoboysComStatusReal.filter(m => m.status === 'Em Entrega').length;
  }

  get pedidosProntos() {
    return this.pedidosRecentes
      .filter(p => p.status === 'Pronto')
      .map(p => ({
        ...p,
        distancia: this.gerarDistanciaMockada(p.id),
        tempoEstimado: this.gerarTempoMockado(p.id),
        esperandoMin: this.gerarEsperaMockada(p.id),
        atrasado: this.gerarEsperaMockada(p.id) >= 10
      }));
  }

  get totalAguardandoEntrega(): number { return this.pedidosProntos.length; }
  get totalEntregasHoje(): number {
    return this.motoboysComStatusReal.reduce((soma, m) => soma + m.entregasHoje, 0);
  }

  private gerarDistanciaMockada(id: string): number {
    const seed = id.charCodeAt(id.length - 1);
    return Math.round((seed % 5 + 1) * 10) / 10;
  }

  private gerarTempoMockado(id: string): number {
    const seed = id.charCodeAt(id.length - 1);
    return (seed % 4 + 1) * 5;
  }

  private gerarEsperaMockada(id: string): number {
    const seed = id.charCodeAt(id.length - 1);
    return (seed % 3) * 5;
  }

  modalAtribuirAberto = false;
  pedidoParaAtribuir: any = null;

  get motoboysDisponiveisParaAtribuir() {
    return this.motoboysComStatusReal.filter(m => m.status === 'Disponível');
  }

  abrirModalAtribuir(pedido: any) {
    if (this.motoboysDisponiveisParaAtribuir.length === 0) {
      alert('Nenhum motoboy disponível no momento!');
      return;
    }
    this.pedidoParaAtribuir = pedido;
    this.modalAtribuirAberto = true;
  }

  fecharModalAtribuir() {
    this.modalAtribuirAberto = false;
    this.pedidoParaAtribuir = null;
  }

  async confirmarAtribuicao(motoboy: any) {
    if (!this.pedidoParaAtribuir) return;
    const pedido = this.pedidoParaAtribuir;
    try {
      // Só grava no Firestore - o status dos motoboys é calculado dinamicamente
      await this.pedidoService.atribuirMotoboy(pedido.id, motoboy.id, motoboy.nome);
      alert(`✅ Pedido #${pedido.numero || pedido.id} atribuído a ${motoboy.nome}!`);
      this.fecharModalAtribuir();
    } catch (erro) {
      console.error('Erro ao atribuir motoboy:', erro);
      alert('Erro ao atribuir motoboy. Tente novamente.');
    }
  }

  iniciarTimerMotoboy(motoboy: any) {
    motoboy.timerTempoFora = setInterval(() => {
      if (motoboy.tempoFora !== null) motoboy.tempoFora += 1;
    }, 60000);
  }

  async marcarEntregue(motoboy: any) {
    if (motoboy.status !== 'Em Entrega') return;
    if (motoboy.pedidoAtual) {
      try {
        await this.pedidoService.marcarEntregue(motoboy.pedidoAtual);
      } catch (erro) {
        console.error('Erro ao marcar entregue:', erro);
      }
    }
    if (motoboy.timerTempoFora) { clearInterval(motoboy.timerTempoFora); motoboy.timerTempoFora = null; }
    if (motoboy.timerFinalizacao) { clearTimeout(motoboy.timerFinalizacao); motoboy.timerFinalizacao = null; }
    motoboy.status = 'Disponível';
    motoboy.localizacao = 'Na loja';
    motoboy.tempoFora = null;
    motoboy.prontoParaAceitar = true;
    motoboy.pedidoAtual = null;
  }

  finalizarEntregaAutomatica(motoboy: any) {
    if (motoboy.status === 'Em Entrega') this.marcarEntregue(motoboy);
  }

  atribuirPedidoMotoboy(pedido: any) { this.abrirModalAtribuir(pedido); }

  // ============================================
  // PRODUTOS — CRUD via Firestore
  // ============================================
  async toggleDisponivel(produto: Produto) {
    try {
      await this.produtoService.toggleDisponivel(produto);
    } catch (erro) {
      console.error('Erro ao toggle:', erro);
      alert('Erro ao alterar disponibilidade. Tente novamente.');
    }
  }

  async excluirProduto(produto: Produto) {
    if (confirm(`Excluir "${produto.nome}" do cardápio?`)) {
      try {
        await this.produtoService.excluir(produto);
      } catch (erro) {
        console.error('Erro ao excluir:', erro);
        alert('Erro ao excluir. Tente novamente.');
      }
    }
  }

  abrirModalAdicionar() {
    this.modoEdicao = false;
    this.produtoEditando = null;
    this.formNome = '';
    this.formDescricao = '';
    this.formPreco = null;
    this.formCategoria = 'Entradas';
    this.formImagem = '';
    this.formEstoque = null;
    this.formStatus = 'Disponível';
    this.modalAberto = true;
  }

  abrirModalEditar(produto: Produto) {
    this.modoEdicao = true;
    this.produtoEditando = produto;
    this.formNome = produto.nome;
    this.formDescricao = produto.descricao;
    this.formPreco = produto.preco;
    this.formCategoria = produto.categoria;
    this.formImagem = produto.imagem;
    this.formEstoque = produto.estoque;
    this.formStatus = produto.disponivel ? 'Disponível' : 'Indisponível';
    this.modalAberto = true;
  }

  fecharModal() {
    this.modalAberto = false;
    this.produtoEditando = null;
  }

  alterarStatusPedidoUI(pedido: any, novoStatus: string) {
    this.alterarStatusPedido(pedido, novoStatus);
  }

  async salvarProduto() {
    if (!this.formNome.trim() || !this.formDescricao.trim() || !this.formPreco || this.formPreco <= 0) {
      alert('Preencha todos os campos obrigatórios!');
      return;
    }
// DEBUG: verificar se está editando ou adicionando
    console.log('🔍 DEBUG salvarProduto:');
    console.log('   modoEdicao:', this.modoEdicao);
    console.log('   produtoEditando:', this.produtoEditando);
    console.log('   produtoEditando.id:', this.produtoEditando?.id);
    const estoqueFinal = this.formEstoque === null || this.formEstoque === undefined ? 999 : this.formEstoque;
    const disponivelFinal = this.formStatus === 'Disponível';
    const imagemFinal = this.formImagem || 'https://i.pinimg.com/736x/c8/4a/33/c84a335905a212e0a36983b3ebfd8010.jpg';

    try {
      if (this.modoEdicao && this.produtoEditando && this.produtoEditando.id) {
        // Atualiza no Firestore
        await this.produtoService.atualizar(this.produtoEditando.id, {
          nome: this.formNome,
          descricao: this.formDescricao,
          preco: this.formPreco,
          categoria: this.formCategoria,
          imagem: imagemFinal,
          estoque: estoqueFinal,
          disponivel: disponivelFinal
        });
      } else {
        // Adiciona no Firestore
        await this.produtoService.adicionar({
          nome: this.formNome,
          descricao: this.formDescricao,
          preco: this.formPreco,
          categoria: this.formCategoria,
          imagem: imagemFinal,
          estoque: estoqueFinal,
          disponivel: disponivelFinal
        });
      }
      this.fecharModal();
    } catch (erro) {
      console.error('Erro ao salvar produto:', erro);
      alert('Erro ao salvar produto. Tente novamente.');
    }
  }
  // ... (outras funções acima)

  async popularBanners() {     
    try {
      await this.bannerService.popularBannersPadrao();
      alert('✅ Banners populados no Firestore!');
    } catch (erro) {
      console.error('Erro ao popular banners:', erro);
      alert('Erro ao popular banners.');
    }
  }

  // RESETA produtos (apaga tudo e volta os 39 padrão)
  async resetarProdutos() {
    const confirmar = confirm(
      '⚠️ ATENÇÃO!\n\n' +
      'Isso vai APAGAR TODOS os produtos atuais (incluindo os que você adicionou) ' +
      'e voltar pros 39 produtos padrão.\n\n' +
      'Tem certeza?'
    );
    if (!confirmar) return;
    try {
      await this.produtoService.resetarProdutos();
      alert('✅ Cardápio resetado!');
    } catch (erro) {
      console.error('Erro ao resetar produtos:', erro);
      alert('Erro ao resetar cardápio.');
    }
  }

  // RESETA banners (apaga tudo e volta os 3 padrão)
  async resetarBanners() {
    const confirmar = confirm(
      '⚠️ ATENÇÃO!\n\n' +
      'Isso vai APAGAR TODOS os banners atuais e voltar pros 3 banners padrão.\n\n' +
      'Tem certeza?'
    );
    if (!confirmar) return;
    try {
      await this.bannerService.resetarBanners();
      alert('✅ Banners resetados!');
    } catch (erro) {
      console.error('Erro ao resetar banners:', erro);
      alert('Erro ao resetar banners.');
    }
  }

  sair() {                     
    if (confirm('Sair do painel administrativo?')) {
      this.router.navigate(['/login']);
    }
  }
}                            