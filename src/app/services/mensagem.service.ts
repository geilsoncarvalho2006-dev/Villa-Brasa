import { Injectable, inject, Injector, runInInjectionContext } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  addDoc,
  query,
  where,
  orderBy,
  serverTimestamp
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class MensagemService {

  private firestore = inject(Firestore);
  private injector = inject(Injector);

  // Nome da coleção no Firestore
  private colecao = 'mensagens';

  /**
   * Escuta em tempo real as mensagens de UM pedido específico.
   * Retorna ordenadas por data de criação (mais antiga primeiro).
   */
  listarPorPedido(pedidoId: string): Observable<any[]> {
    return runInInjectionContext(this.injector, () => {
      const ref = collection(this.firestore, this.colecao);
      const q = query(
        ref,
        where('pedidoId', '==', pedidoId),
        orderBy('criadoEm', 'asc')
      );
      // idField: 'id' faz o Firestore devolver o ID do documento junto
      return collectionData(q, { idField: 'id' }) as Observable<any[]>;
    });
  }

  /**
   * Grava uma nova mensagem no Firestore.
   * autor = 'cliente' ou 'motoboy'
   */
  async enviar(pedidoId: string, autor: 'cliente' | 'motoboy', texto: string): Promise<void> {
    return runInInjectionContext(this.injector, async () => {
      const ref = collection(this.firestore, this.colecao);
      // hora legível pra exibir na bolha (criadoEm é pra ordenar)
      const hora = new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
      });
      await addDoc(ref, {
        pedidoId: pedidoId,
        autor: autor,
        texto: texto,
        hora: hora,
        criadoEm: serverTimestamp()
      });
    });
  }
}