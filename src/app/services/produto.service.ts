import { Injectable, inject, Injector, runInInjectionContext } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';

export interface Produto {
  id?: string;  // ID gerado pelo Firestore
  nome: string;
  descricao: string;
  preco: number;
  categoria: string;
  imagem: string;
  estoque: number;
  disponivel: boolean;
  diasDisponiveis?: string[];
}

// Lista padrão (usada apenas pra "popular" o Firestore na primeira vez)
const PRODUTOS_PADRAO: Omit<Produto, 'id'>[] = [
  { nome: 'Anéis de Cebola', descricao: 'Cebolas empanadas douradas e crocantes, servidas com molho especial', preco: 18.90, categoria: 'Entradas', imagem: 'https://i.pinimg.com/736x/67/47/c5/6747c5c4cfb80a9fe16b7b65a6b07cd2.jpg', estoque: 25, disponivel: true },
  { nome: 'Asas de Frango Buffalo', descricao: 'Asinhas picantes com molho buffalo e molho ranch', preco: 28.90, categoria: 'Entradas', imagem: 'https://i.pinimg.com/736x/c4/89/f8/c489f8390d7e77e8810f7a4629f979bf.jpg', estoque: 15, disponivel: true },
  { nome: 'Sticks de Mussarela', descricao: 'Palitos de mussarela empanados, dourados e macios por dentro', preco: 22.90, categoria: 'Entradas', imagem: 'https://i.pinimg.com/736x/49/6c/eb/496cebfb9d5c69b76943b3c50077a12d.jpg', estoque: 4, disponivel: true },
  { nome: 'Nachos Supremos', descricao: 'Tortilhas crocantes com queijo derretido, jalapenos, guacamole e creme', preco: 32.90, categoria: 'Entradas', imagem: 'https://i.pinimg.com/736x/cd/9a/6b/cd9a6b3b2b7545f7cde1ea0f99202013.jpg', estoque: 12, disponivel: false },
  { nome: 'Bruschetta Tradicional', descricao: 'Pão italiano tostado com tomate, manjericão fresco e azeite', preco: 19.90, categoria: 'Entradas', imagem: 'https://i.pinimg.com/736x/31/ff/6b/31ff6bd82f295785535c71e6f52c1942.jpg', estoque: 18, disponivel: true },
  { nome: 'Batatas Rústicas', descricao: 'Batatas em gomos com casca, temperadas e crocantes', preco: 16.90, categoria: 'Entradas', imagem: 'https://i.pinimg.com/736x/72/fc/e0/72fce0f7ab18f38d88cf0fba3e882285.jpg', estoque: 30, disponivel: true },
  { nome: 'Pão de Alho', descricao: 'Pão artesanal tostado com manteiga de alho e ervas', preco: 14.90, categoria: 'Entradas', imagem: 'https://i.pinimg.com/736x/92/fa/b0/92fab09e2fffe1e2e2393c1658d40541.jpg', estoque: 22, disponivel: true },
  { nome: 'Carpaccio', descricao: 'Finas lâminas de carne com parmesão, rúcula e molho especial', preco: 32.90, categoria: 'Entradas', imagem: 'https://i.pinimg.com/736x/b7/de/de/b7dede5413f652d201d1caf19340f33a.jpg', estoque: 8, disponivel: true },
  { nome: 'Villa Clássico', descricao: '180g de blend premium na brasa, queijo cheddar, alface, tomate e molho especial', preco: 38.90, categoria: 'Burgers na Brasa', imagem: 'https://i.pinimg.com/736x/c8/4a/33/c84a335905a212e0a36983b3ebfd8010.jpg', estoque: 20, disponivel: true },
  { nome: 'Villa Duplo', descricao: '360g de carne na brasa, duplo queijo, bacon e cebola caramelizada', preco: 52.90, categoria: 'Burgers na Brasa', imagem: 'https://i.pinimg.com/736x/28/a7/a0/28a7a07a54b7c9f791aea14550a9fc2f.jpg', estoque: 14, disponivel: true },
  { nome: 'Cogumelos Suíço', descricao: '180g na brasa, cogumelos salteados, queijo suíço e molho cremoso', preco: 42.90, categoria: 'Burgers na Brasa', imagem: 'https://i.pinimg.com/736x/03/32/13/0332137529e0d27d742fe3d4aab00435.jpg', estoque: 10, disponivel: true },
  { nome: 'Chicken Brasa', descricao: 'Peito de frango grelhado, queijo provolone, rúcula e aioli', preco: 36.90, categoria: 'Burgers na Brasa', imagem: 'https://i.pinimg.com/736x/cf/a5/24/cfa524987aab90fc439feaf2db094a3b.jpg', estoque: 16, disponivel: true },
  { nome: 'Veggie Brasa', descricao: 'Hambúrguer artesanal de grão-de-bico, vegetais grelhados e molho tahine', preco: 34.90, categoria: 'Burgers na Brasa', imagem: 'https://i.pinimg.com/736x/3a/85/3f/3a853fd576a08853073dc59fe3cf965d.jpg', estoque: 6, disponivel: true },
  { nome: 'Blue Cheese Premium', descricao: '200g na brasa, gorgonzola cremoso, tomate e rúcula', preco: 46.90, categoria: 'Burgers na Brasa', imagem: 'https://i.pinimg.com/736x/10/41/f1/1041f159f07d6e610fdf64bb08df9ee3.jpg', estoque: 11, disponivel: true },
  { nome: 'Spicy Jalapeño', descricao: '180g na brasa, jalapeños, pimenta, queijo pepper jack e molho picante', preco: 41.90, categoria: 'Burgers na Brasa', imagem: 'https://i.pinimg.com/736x/53/4a/e4/534ae4848013c64c2189453eb5dde1f0.jpg', estoque: 9, disponivel: true },
  { nome: 'Villa Completo', descricao: '200g na brasa, bacon, ovo, queijo, alface, tomate, cebola caramelizada', preco: 49.90, categoria: 'Burgers na Brasa', imagem: 'https://i.pinimg.com/1200x/33/09/5f/33095fab8635debe25dafd73744e2554.jpg', estoque: 13, disponivel: true },
  { nome: 'Smash Clássico', descricao: 'Dois hambúrgueres smash, queijo americano, picles e molho especial', preco: 32.90, categoria: 'Smash Burgers', imagem: 'https://ogimg.infoglobo.com.br/rioshow/25033674-ea4-3ac/FT1086A/smash-burger.jpg', estoque: 18, disponivel: true },
  { nome: 'Smash Duplo', descricao: 'Quatro hambúrgueres smash, queijo, bacon e cebola caramelizada', preco: 44.90, categoria: 'Smash Burgers', imagem: 'https://www.seara.com.br/wp-content/uploads/2025/09/smash-burger-portal-minha-receita.webp', estoque: 11, disponivel: true },
  { nome: 'Smash Bacon', descricao: 'Dois smash, queijo cheddar, muito bacon crocante e molho barbecue', preco: 38.90, categoria: 'Smash Burgers', imagem: 'https://i.pinimg.com/736x/b1/ec/f4/b1ecf47851576c4efd66197fcb8317be.jpg', estoque: 7, disponivel: true },
  { nome: 'Smash Trufado', descricao: 'Dois smash, queijo brie, rúcula e aioli de trufa negra', preco: 46.90, categoria: 'Smash Burgers', imagem: 'https://i.pinimg.com/736x/32/36/6a/32366abe74988d01565a6e0baca3691d.jpg', estoque: 5, disponivel: true },
  { nome: 'Combo Villa Clássico', descricao: 'Villa Clássico + Batata Frita + Refrigerante Lata', preco: 52.90, categoria: 'Promocoes', imagem: 'https://i.pinimg.com/736x/2c/bd/69/2cbd6947f849bd5f949defba95d6c570.jpg', estoque: 15, disponivel: true },
  { nome: 'Combo Smash Duplo', descricao: 'Smash Duplo + Batata Frita + Refrigerante Lata', preco: 59.90, categoria: 'Promocoes', imagem: 'https://i.pinimg.com/1200x/54/af/90/54af9003c2b38a3f8287b909e2edcbdf.jpg', estoque: 12, disponivel: true },
  { nome: 'Combo Chicken', descricao: 'Chicken Brasa + Batata Frita + Refrigerante Lata', preco: 49.90, categoria: 'Promocoes', imagem: 'https://i.pinimg.com/1200x/a4/c7/46/a4c74603673e8af61fd9c3d053a4207b.jpg', estoque: 14, disponivel: true },
  { nome: 'Combo Família', descricao: '4 Burgers Clássicos + 2 Batatas Grandes + 4 Refrigerantes', preco: 159.90, categoria: 'Promocoes', imagem: 'https://i.pinimg.com/1200x/cc/01/09/cc0109e96dc77f276fbce8e02fc5c0b2.jpg', estoque: 8, disponivel: true },
  { nome: 'Risoto de Cogumelos', descricao: 'Risoto cremoso com mix de cogumelos porcini e champignon', preco: 52.90, categoria: 'Risotos', imagem: 'https://i.pinimg.com/1200x/af/31/f9/af31f9aacd3134968b3656545ae36170.jpg', estoque: 10, disponivel: true },
  { nome: 'Risoto de Camarão', descricao: 'Risoto cremoso com camarões grelhados e toque de limão siciliano', preco: 64.90, categoria: 'Risotos', imagem: 'https://i.pinimg.com/1200x/7c/eb/e2/7cebe2e57288e190e401ed424388065a.jpg', estoque: 6, disponivel: true },
  { nome: 'Risoto Carbonara', descricao: 'Risoto cremoso com bacon crocante, gema e parmesão', preco: 54.90, categoria: 'Risotos', imagem: 'https://i.pinimg.com/736x/e4/5e/09/e45e095d0cc8cd52fb8617a3f63bc44e.jpg', estoque: 9, disponivel: true },
  { nome: 'Caprese Premium', descricao: 'Mussarela de búfala, tomate italiano, manjericão fresco e azeite trufado', preco: 38.90, categoria: 'Saladas', imagem: 'https://i.pinimg.com/736x/c8/b5/e4/c8b5e4a0f6d9cf812f114669ecdc53af.jpg', estoque: 13, disponivel: true },
  { nome: 'Grega Tradicional', descricao: 'Alface, tomate, pepino, azeitonas pretas, cebola roxa e queijo feta', preco: 34.90, categoria: 'Saladas', imagem: 'https://i.pinimg.com/736x/8f/bb/c7/8fbbc7413e2fd45b783ba49925cab9a1.jpg', estoque: 17, disponivel: true },
  { nome: 'Churrasco Argentino', descricao: '300g de corte argentino grelhado na brasa com chimichurri', preco: 58.90, categoria: 'Monte seu Prato', imagem: 'https://i.pinimg.com/736x/2d/f9/fa/2df9fa4908c7da6f2e7428ba18e0f440.jpg', estoque: 7, disponivel: true },
  { nome: 'Frango Grelhado', descricao: 'Peito de frango marinado e grelhado com ervas finas', preco: 42.90, categoria: 'Monte seu Prato', imagem: 'https://i.pinimg.com/1200x/eb/9c/1c/eb9c1cbef13d58b00d2a381d5275b1e7.jpg', estoque: 12, disponivel: true },
  { nome: 'Brownie Premium', descricao: 'Brownie de chocolate belga com sorvete de baunilha e calda quente', preco: 22.90, categoria: 'Sobremesas', imagem: 'https://i.pinimg.com/736x/a1/9e/70/a19e706bd71f1a72939eedcf2d8a000a.jpg', estoque: 20, disponivel: true },
  { nome: 'Tiramisu', descricao: 'Clássico italiano com mascarpone, café expresso e cacau', preco: 24.90, categoria: 'Sobremesas', imagem: 'https://i.pinimg.com/736x/e8/f5/b9/e8f5b904f2793b2af0d2885d732065a5.jpg', estoque: 14, disponivel: true },
  { nome: 'Cheesecake de Frutas Vermelhas', descricao: 'Cheesecake cremoso com calda de frutas vermelhas', preco: 26.90, categoria: 'Sobremesas', imagem: 'https://i.pinimg.com/736x/b4/70/8b/b4708b8a6fc37458a7c2a1fc92b9eeaa.jpg', estoque: 16, disponivel: true },
  { nome: 'Heineken Long Neck', descricao: 'Garrafa 330ml', preco: 13.90, categoria: 'Bebidas', imagem: 'https://i.pinimg.com/736x/55/5c/f1/555cf1b22eaa5deb9eb1abd7eb1214b7.jpg', estoque: 28, disponivel: true },
  { nome: 'Stella Artois Long Neck', descricao: 'Garrafa 330ml', preco: 11.90, categoria: 'Bebidas', imagem: 'https://i.pinimg.com/1200x/4e/04/ee/4e04eed8ccfaa0ac883c784bd9f38dcc.jpg', estoque: 25, disponivel: true },
  { nome: 'Coca-Cola', descricao: 'Lata 350ml', preco: 9.90, categoria: 'Bebidas', imagem: 'https://i.pinimg.com/1200x/ae/2d/65/ae2d65d73a98f127fdc0b320b2482c8b.jpg', estoque: 30, disponivel: true },
  { nome: 'Suco de Laranja', descricao: 'Suco natural de laranja fresco (500ml)', preco: 12.90, categoria: 'Bebidas', imagem: 'https://i.pinimg.com/736x/96/cf/af/96cfafe88949e969050ab9426f2f79f7.jpg', estoque: 19, disponivel: true },
  { nome: 'Caipirinha', descricao: 'Copo 500ml - Morango, limão ou Maracujá', preco: 25.00, categoria: 'Bebidas', imagem: 'https://i.pinimg.com/1200x/89/25/7c/89257c614fc7b8c52308791f2c594f30.jpg', estoque: 22, disponivel: true }
];

@Injectable({
  providedIn: 'root'
})
export class ProdutoService {

  private firestore = inject(Firestore);
  private injector = inject(Injector);

  // Helper: roda Firebase APIs dentro do injection context (necessário pro Angular 21)
  private rodarNoContexto<T>(fn: () => T): T {
    return runInInjectionContext(this.injector, fn);
  }

  // Lista TODOS os produtos em tempo real (Admin usa)
 // Ordem desejada das categorias (igual ao menu)
private ordemCategorias = [
    'Entradas',
    'Burgers na Brasa',
    'Smash Burgers',
    'Promocoes',
    'Risotos',
    'Saladas',
    'Monte seu Prato',
    'Sobremesas',
    'Bebidas'
  ];

  listarTodos(): Observable<Produto[]> {
    return this.rodarNoContexto(() => {
      const ref = collection(this.firestore, 'produtos');
      // Busca tudo sem ordenação do Firestore
      const obs = collectionData(ref, { idField: 'id' }) as Observable<Produto[]>;
      // Ordena MANUALMENTE pela ordem do menu
      return new Observable<Produto[]>(subscriber => {
        const sub = obs.subscribe(produtos => {
          const ordenados = [...produtos].sort((a, b) => {
            const idxA = this.ordemCategorias.indexOf(a.categoria);
            const idxB = this.ordemCategorias.indexOf(b.categoria);
            // Se categoria não está na lista, joga pro fim
            const posA = idxA === -1 ? 999 : idxA;
            const posB = idxB === -1 ? 999 : idxB;
            return posA - posB;
          });
          subscriber.next(ordenados);
        });
        return () => sub.unsubscribe();
      });
    });
  }

  // Adiciona produto novo
  async adicionar(produto: Omit<Produto, 'id'>): Promise<string> {
    return this.rodarNoContexto(async () => {
      const ref = collection(this.firestore, 'produtos');
      const docRef = await addDoc(ref, produto);
      return docRef.id;
    });
  }

  // Atualiza produto existente
  async atualizar(id: string, dados: Partial<Produto>): Promise<void> {
    return this.rodarNoContexto(async () => {
      const ref = doc(this.firestore, 'produtos', id);
      // Remove o "id" do payload antes de gravar
      const { id: _, ...dadosSemId } = dados as any;
      await updateDoc(ref, dadosSemId);
    });
  }

  // Toggle disponibilidade
  async toggleDisponivel(produto: Produto): Promise<void> {
    if (!produto.id) {
      console.error('Produto sem ID, não é possível togglar');
      return;
    }
    await this.atualizar(produto.id, { disponivel: !produto.disponivel });
  }

  // Exclui produto
  async excluir(produto: Produto): Promise<void> {
    if (!produto.id) {
      console.error('Produto sem ID, não é possível excluir');
      return;
    }
    return this.rodarNoContexto(async () => {
      const ref = doc(this.firestore, 'produtos', produto.id!);
      await deleteDoc(ref);
    });
  }

  // POPULA o Firestore com os 39 produtos padrão (chamar 1 vez só)
  // POPULA o Firestore com os 39 produtos padrão
async popularProdutosPadrao(): Promise<void> {
    return this.rodarNoContexto(async () => {
      const ref = collection(this.firestore, 'produtos');
      console.log('🔵 Populando Firestore com', PRODUTOS_PADRAO.length, 'produtos...');
      for (const produto of PRODUTOS_PADRAO) {
        await addDoc(ref, produto);
      }
      console.log('✅ Firestore populado com sucesso!');
    });
  }

  // RESETA: apaga tudo e repopula com os 39 padrão
  async resetarProdutos(): Promise<void> {
    return this.rodarNoContexto(async () => {
      console.log('🔴 Apagando todos os produtos...');
      const ref = collection(this.firestore, 'produtos');
      // Pega snapshot atual e deleta cada doc
      const snapshot = await new Promise<any[]>((resolve) => {
        const sub = collectionData(ref, { idField: 'id' }).subscribe((docs: any) => {
          sub.unsubscribe();
          resolve(docs);
        });
      });

      for (const produto of snapshot) {
        if (produto.id) {
          await deleteDoc(doc(this.firestore, 'produtos', produto.id));
        }
      }

      console.log('🔵 Repopulando com', PRODUTOS_PADRAO.length, 'produtos padrão...');
      for (const produto of PRODUTOS_PADRAO) {
        await addDoc(ref, produto);
      }
      console.log('✅ Reset completo!');
    });
  }
}