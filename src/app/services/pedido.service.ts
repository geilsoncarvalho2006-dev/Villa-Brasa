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
  where,
  orderBy
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';

export interface Pedido {
  id?: string;
  numero: string;
  cliente: string;
  email: string;
  hora: string;
  dataCompleta: string;
  valor: number;
  formaPagamento: string;
  status: string;
  itens: any[];
  endereco: string;
  observacoes?: string;

  motoboyId?: string;
  motoboyNome?: string;
  horaAceite?: string;
  horaConclusao?: string;
  horaCancelamento?: string;
  motivoCancelamento?: string;
  observacoesCancelamento?: string;

  criadoEm?: any;
}

@Injectable({
  providedIn: 'root'
})
export class PedidoService {

  private firestore = inject(Firestore);
  private injector = inject(Injector);

  // Helper: garante que Firestore é chamado dentro do Injection Context
  private rodarNoContexto<T>(fn: () => T): T {
    return runInInjectionContext(this.injector, fn);
  }

  // Criar pedido
  async criarPedido(pedido: Omit<Pedido, 'id'>): Promise<string> {
    return this.rodarNoContexto(async () => {
      const colecao = collection(this.firestore, 'pedidos');
      const docRef = await addDoc(colecao, {
        ...pedido,
        criadoEm: new Date()
      });
      return docRef.id;
    });
  }

  // Listar todos
  listarTodos(): Observable<Pedido[]> {
    return this.rodarNoContexto(() => {
      const colecao = collection(this.firestore, 'pedidos');
      const q = query(colecao, orderBy('criadoEm', 'desc'));
      return collectionData(q, { idField: 'id' }) as Observable<Pedido[]>;
    });
  }

  // Listar por status
  listarPorStatus(status: string | string[]): Observable<Pedido[]> {
    return this.rodarNoContexto(() => {
      const colecao = collection(this.firestore, 'pedidos');
      let q;
      if (Array.isArray(status)) {
        q = query(colecao, where('status', 'in', status), orderBy('criadoEm', 'desc'));
      } else {
        q = query(colecao, where('status', '==', status), orderBy('criadoEm', 'desc'));
      }
      return collectionData(q, { idField: 'id' }) as Observable<Pedido[]>;
    });
  }

  // Listar por email
  listarPorEmail(email: string): Observable<Pedido[]> {
    return this.rodarNoContexto(() => {
      const colecao = collection(this.firestore, 'pedidos');
      const q = query(colecao, where('email', '==', email), orderBy('criadoEm', 'desc'));
      return collectionData(q, { idField: 'id' }) as Observable<Pedido[]>;
    });
  }

  // Listar por motoboy
  listarPorMotoboy(motoboyId: string): Observable<Pedido[]> {
    return this.rodarNoContexto(() => {
      const colecao = collection(this.firestore, 'pedidos');
      const q = query(colecao, where('motoboyId', '==', motoboyId), orderBy('criadoEm', 'desc'));
      return collectionData(q, { idField: 'id' }) as Observable<Pedido[]>;
    });
  }

  // Atualizar status
  async atualizarStatus(idPedido: string, novoStatus: string): Promise<void> {
    return this.rodarNoContexto(async () => {
      const refDoc = doc(this.firestore, 'pedidos', idPedido);
      await updateDoc(refDoc, { status: novoStatus });
    });
  }

  // Atribuir motoboy
  async atribuirMotoboy(idPedido: string, motoboyId: string, motoboyNome: string): Promise<void> {
    return this.rodarNoContexto(async () => {
      const refDoc = doc(this.firestore, 'pedidos', idPedido);
      await updateDoc(refDoc, {
        status: 'Em Entrega',
        motoboyId: motoboyId,
        motoboyNome: motoboyNome,
        horaAceite: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      });
    });
  }

  // Marcar como entregue
  async marcarEntregue(idPedido: string): Promise<void> {
    return this.rodarNoContexto(async () => {
      const refDoc = doc(this.firestore, 'pedidos', idPedido);
      await updateDoc(refDoc, {
        status: 'Entregue',
        horaConclusao: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      });
    });
  }

  // Cancelar entrega
  async cancelarEntrega(idPedido: string, motivo: string, observacoes: string): Promise<void> {
    return this.rodarNoContexto(async () => {
      const refDoc = doc(this.firestore, 'pedidos', idPedido);
      await updateDoc(refDoc, {
        status: 'Cancelado',
        motivoCancelamento: motivo,
        observacoesCancelamento: observacoes,
        horaCancelamento: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      });
    });
  }

  // Atualizar genérico
  async atualizar(idPedido: string, dados: Partial<Pedido>): Promise<void> {
    return this.rodarNoContexto(async () => {
      const refDoc = doc(this.firestore, 'pedidos', idPedido);
      await updateDoc(refDoc, dados);
    });
  }

  // Excluir
  async excluir(idPedido: string): Promise<void> {
    return this.rodarNoContexto(async () => {
      const refDoc = doc(this.firestore, 'pedidos', idPedido);
      await deleteDoc(refDoc);
    });
  }
}