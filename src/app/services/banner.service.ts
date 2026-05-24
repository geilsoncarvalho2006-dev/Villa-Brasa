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
import { Observable, BehaviorSubject } from 'rxjs';

export interface Banner {
  id?: string;  // ID gerado pelo Firestore (string, não number)
  titulo: string;
  subtitulo: string;
  imagem: string;
  textoBotao: string;
  cta: string;
  ordem: number;
  ativo: boolean;
}

// Banners padrão para popular o Firestore na primeira vez
const BANNERS_PADRAO: Omit<Banner, 'id'>[] = [
  {
    titulo: 'Bem-vindo ao Villa Brasa',
    subtitulo: 'Os melhores pratos da casa',
    imagem: 'https://i.pinimg.com/1200x/c8/dd/17/c8dd1747b1d96bb961685e1804e2a714.jpg',
    textoBotao: 'Ver Cardápio',
    cta: '#menu',
    ordem: 1,
    ativo: true
  },
  {
    titulo: 'Promoção Especial',
    subtitulo: 'Combo Villa Clássico com 20% de desconto',
    imagem: 'https://i.pinimg.com/736x/2c/bd/69/2cbd6947f849bd5f949defba95d6c570.jpg',
    textoBotao: 'Aproveitar',
    cta: '#specials',
    ordem: 2,
    ativo: true
  },
  {
    titulo: 'Novidade do Mês',
    subtitulo: 'Experimente nosso risoto de cogumelos',
    imagem: 'https://i.pinimg.com/1200x/af/31/f9/af31f9aacd3134968b3656545ae36170.jpg',
    textoBotao: 'Pedir Agora',
    cta: '#order',
    ordem: 3,
    ativo: true
  }
];

@Injectable({
  providedIn: 'root'
})
export class BannerService {

  private firestore = inject(Firestore);
  private injector = inject(Injector);

  // Cache local atualizado em tempo real pelo Firestore
  // Permite que getTodos() e getAtivos() retornem sincronamente
  private bannersCache: Banner[] = [];

  constructor() {
    // Escuta o Firestore e mantém o cache atualizado
    this.listarTodos().subscribe(banners => {
      this.bannersCache = banners;
    });
  }

  private rodarNoContexto<T>(fn: () => T): T {
    return runInInjectionContext(this.injector, fn);
  }

  // Lista todos os banners em tempo real (Observable)
  listarTodos(): Observable<Banner[]> {
    return this.rodarNoContexto(() => {
      const ref = collection(this.firestore, 'banners');
      const q = query(ref, orderBy('ordem'));
      return collectionData(q, { idField: 'id' }) as Observable<Banner[]>;
    });
  }

  // Retorna todos os banners do cache (síncrono - compatibilidade com código antigo)
  getTodos(): Banner[] {
    return this.bannersCache;
  }

  // Retorna só os ATIVOS, ordenados por ordem
  getAtivos(): Banner[] {
    return this.bannersCache
      .filter(b => b.ativo)
      .sort((a, b) => a.ordem - b.ordem);
  }

  // Adiciona um banner no Firestore
  async adicionar(banner: Omit<Banner, 'id'>): Promise<string> {
    return this.rodarNoContexto(async () => {
      const ref = collection(this.firestore, 'banners');
      const docRef = await addDoc(ref, banner);
      return docRef.id;
    });
  }

  // Atualiza um banner no Firestore
  async atualizar(id: string | number, dados: Partial<Banner>): Promise<void> {
    return this.rodarNoContexto(async () => {
      const ref = doc(this.firestore, 'banners', id.toString());
      // Remove o "id" do payload antes de gravar
      const { id: _, ...dadosSemId } = dados as any;
      await updateDoc(ref, dadosSemId);
    });
  }

  // Exclui um banner do Firestore
  async excluir(id: string | number): Promise<void> {
    return this.rodarNoContexto(async () => {
      const ref = doc(this.firestore, 'banners', id.toString());
      await deleteDoc(ref);
    });
  }

  // Toggle ativo/inativo
  async toggleAtivo(id: string | number): Promise<void> {
    const banner = this.bannersCache.find(b => b.id === id.toString() || b.id === id);
    if (banner) {
      await this.atualizar(id, { ativo: !banner.ativo });
    }
  }

  // POPULA o Firestore com banners padrão (clicar 1 vez só)
  async popularBannersPadrao(): Promise<void> {
    return this.rodarNoContexto(async () => {
      console.log('🔵 Populando Firestore com', BANNERS_PADRAO.length, 'banners...');
      const ref = collection(this.firestore, 'banners');
      for (const banner of BANNERS_PADRAO) {
        await addDoc(ref, banner);
      }
      console.log('✅ Banners populados com sucesso!');
    });
  }
  // RESETA: apaga tudo e repopula com os 3 banners padrão
  async resetarBanners(): Promise<void> {
    return this.rodarNoContexto(async () => {
      console.log('🔴 Apagando todos os banners...');
      const ref = collection(this.firestore, 'banners');
      // Pega snapshot atual e deleta cada doc
      const snapshot = await new Promise<any[]>((resolve) => {
        const sub = collectionData(ref, { idField: 'id' }).subscribe((docs: any) => {
          sub.unsubscribe();
          resolve(docs);
        });
      });

      for (const banner of snapshot) {
        if (banner.id) {
          await deleteDoc(doc(this.firestore, 'banners', banner.id));
        }
      }

      console.log('🔵 Repopulando com', BANNERS_PADRAO.length, 'banners padrão...');
      for (const banner of BANNERS_PADRAO) {
        await addDoc(ref, banner);
      }
      console.log('✅ Reset completo!');
    });
  }
}