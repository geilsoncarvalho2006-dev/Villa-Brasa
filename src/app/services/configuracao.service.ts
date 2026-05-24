import { Injectable, inject, Injector, runInInjectionContext } from '@angular/core';
import {
  Firestore,
  doc,
  docData,
  setDoc
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';

export interface ConfiguracaoDelivery {
  taxaEntrega: number;
  pedidoMinimo: number;
  tempoEstimado: number;   // minutos
  raioEntrega: number;     // km
}

// Valores padrão se Firestore ainda não tiver nada
const CONFIG_PADRAO: ConfiguracaoDelivery = {
  taxaEntrega: 5.00,
  pedidoMinimo: 0,
  tempoEstimado: 45,
  raioEntrega: 5
};

@Injectable({
  providedIn: 'root'
})
export class ConfiguracaoService {

  private firestore = inject(Firestore);
  private injector = inject(Injector);

  // ID fixo do documento - vai existir só 1 doc de config
  private readonly CONFIG_DOC_ID = 'delivery';

  private rodarNoContexto<T>(fn: () => T): T {
    return runInInjectionContext(this.injector, fn);
  }

  // Escuta as configurações em tempo real (Customer usa)
  listarConfig(): Observable<ConfiguracaoDelivery> {
    return this.rodarNoContexto(() => {
      const ref = doc(this.firestore, 'configuracoes', this.CONFIG_DOC_ID);
      return docData(ref) as Observable<ConfiguracaoDelivery>;
    });
  }

  // Salva (cria ou atualiza) - setDoc sobrescreve o documento inteiro
  async salvarConfig(config: ConfiguracaoDelivery): Promise<void> {
    return this.rodarNoContexto(async () => {
      const ref = doc(this.firestore, 'configuracoes', this.CONFIG_DOC_ID);
      await setDoc(ref, config);
    });
  }

  // Retorna valores padrão (caso Firestore vazio)
  getPadrao(): ConfiguracaoDelivery {
    return { ...CONFIG_PADRAO };
  }
}