import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Auth, signInWithEmailAndPassword, sendPasswordResetEmail, createUserWithEmailAndPassword } from '@angular/fire/auth';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {

  tela = 'login';
  email = '';
  senha = '';
  erro = '';
  sucesso = '';
  carregando = false;
  perfil = 'customer';

  emailRecuperar = '';
  codigo = '';
  novaSenha = '';
  confirmarSenha = '';

  nomeNovo = '';
  emailNovo = '';
  senhaNova = '';

  constructor(private auth: Auth, private router: Router) {}

  async entrar() {
    this.erro = '';
    this.carregando = true;
    try {
      await signInWithEmailAndPassword(this.auth, this.email, this.senha);
      this.router.navigate(['/' + this.perfil]);
    } catch (error: any) {
      this.erro = 'Email ou senha incorretos!';
    } finally {
      this.carregando = false;
    }
  }

  enviarCodigo() {
  if (!this.emailRecuperar) {
    this.erro = 'Digite seu email!';
    return;
  }
  this.tela = 'verificar';
}

  verificarCodigo() {
  if (this.codigo.length >= 4) {
    this.tela = 'novaSenha';
  } else {
    this.erro = 'Digite pelo menos 4 dígitos!';
  }
}

 redefinirSenha() {
  if (!this.novaSenha || !this.confirmarSenha) {
    this.erro = 'Preencha os dois campos!';
    return;
  }
  if (this.novaSenha !== this.confirmarSenha) {
    this.erro = 'As senhas não coincidem!';
    return;
  }
  this.voltarLogin();
}

  async cadastrar() {
    this.erro = '';
    this.carregando = true;
    try {
      await createUserWithEmailAndPassword(this.auth, this.emailNovo, this.senhaNova);
      this.router.navigate(['/customer']);
    } catch (error: any) {
      this.erro = 'Erro ao criar conta. Tente novamente!';
    } finally {
      this.carregando = false;
    }
  }

  voltarLogin() {
    this.tela = 'login';
    this.erro = '';
    this.sucesso = '';
  }
  async entrarComoCliente() {
  this.erro = '';
  this.carregando = true;
  this.perfil = 'customer';
  try {
    await signInWithEmailAndPassword(this.auth, this.email, this.senha);
    this.router.navigate(['/customer']);
  } catch (error: any) {
    this.erro = 'Email ou senha incorretos!';
  } finally {
    this.carregando = false;
  }
}
}