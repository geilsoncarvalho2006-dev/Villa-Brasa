import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { 
  Auth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  user,
  User
} from '@angular/fire/auth';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth = inject(Auth);
  private router = inject(Router);

  // Observa o estado do usuário logado em tempo real
  public usuarioAtual$: Observable<User | null> = user(this.auth);

  /**
   * Faz login com email e senha.
   * @param email Email do usuário
   * @param senha Senha do usuário
   * @returns Promise com as credenciais do usuário
   */
  async login(email: string, senha: string) {
    try {
      const credencial = await signInWithEmailAndPassword(this.auth, email, senha);
      console.log('✅ Login bem-sucedido:', credencial.user.email);
      return credencial;
    } catch (erro: any) {
      console.error('❌ Erro no login:', erro.code);
      throw this.traduzirErroFirebase(erro.code);
    }
  }

  /**
   * Cadastra um novo usuário com email e senha.
   * @param email Email do novo usuário
   * @param senha Senha (mínimo 6 caracteres)
   */
  async cadastrar(email: string, senha: string) {
    try {
      const credencial = await createUserWithEmailAndPassword(this.auth, email, senha);
      console.log('✅ Usuário cadastrado:', credencial.user.email);
      return credencial;
    } catch (erro: any) {
      console.error('❌ Erro no cadastro:', erro.code);
      throw this.traduzirErroFirebase(erro.code);
    }
  }

  /**
   * Faz logout do usuário atual e redireciona para a tela de login.
   */
  async logout() {
    try {
      await signOut(this.auth);
      console.log('✅ Logout realizado');
      this.router.navigate(['/login']);
    } catch (erro: any) {
      console.error('❌ Erro no logout:', erro);
    }
  }

  /**
   * Traduz códigos de erro do Firebase para mensagens em português.
   */
  private traduzirErroFirebase(codigo: string): string {
    const mensagens: { [key: string]: string } = {
      'auth/invalid-email': 'Email inválido',
      'auth/user-disabled': 'Usuário desativado',
      'auth/user-not-found': 'Usuário não encontrado',
      'auth/wrong-password': 'Senha incorreta',
      'auth/invalid-credential': 'Email ou senha incorretos',
      'auth/email-already-in-use': 'Este email já está cadastrado',
      'auth/weak-password': 'Senha muito fraca (mínimo 6 caracteres)',
      'auth/network-request-failed': 'Erro de conexão com a internet',
      'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde'
    };
    return mensagens[codigo] || 'Erro desconhecido. Tente novamente.';
  }
}