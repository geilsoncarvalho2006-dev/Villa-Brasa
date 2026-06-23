# 🍔 Villa Brasa — Sistema de Delivery para Hamburgueria

Sistema de delivery completo desenvolvido com **Angular** e **Firebase**, permitindo que clientes naveguem pelo cardápio, montem pedidos e acompanhem entregas em tempo real.

---



## ✨ Funcionalidades

- 🗂️ Cardápio digital com categorias e produtos
- 🛒 Carrinho de compras interativo
- 📦 Rastreamento de pedidos em tempo real
- 🔐 Autenticação de usuários via Firebase Auth
- ☁️ Banco de dados em tempo real com Firestore
- 📱 Layout responsivo para mobile e desktop

---

## 🛠️ Tecnologias

| Tecnologia | Versão |
|---|---|
| Angular | 21.2.8 |
| Firebase | — |
| TypeScript | — |
| HTML / CSS | — |

---

## 🚀 Como rodar o projeto

### Pré-requisitos

- Node.js 18+
- Angular CLI instalado globalmente:
  ```bash
  npm install -g @angular/cli
  ```
- Conta no [Firebase Console](https://console.firebase.google.com/)

### 1. Clone o repositório

```bash
git clone https://github.com/geilsoncarvalho2006-dev/Villa-Brasa.git
cd Villa-Brasa
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure o Firebase

Crie um arquivo `src/environments/environment.ts` com suas credenciais do Firebase:

```typescript
export const environment = {
  production: false,
  firebase: {
    apiKey: "SUA_API_KEY",
    authDomain: "SEU_AUTH_DOMAIN",
    projectId: "SEU_PROJECT_ID",
    storageBucket: "SEU_STORAGE_BUCKET",
    messagingSenderId: "SEU_SENDER_ID",
    appId: "SEU_APP_ID"
  }
};
```

### 4. Rode o servidor de desenvolvimento

```bash
ng serve
```

Acesse em: `http://localhost:4200/`

---

## 📁 Estrutura do projeto

```
Villa-Brasa/
├── public/          # Assets estáticos
├── src/
│   ├── app/         # Componentes e módulos Angular
│   ├── environments/ # Configurações de ambiente
│   └── ...
├── firebase.json    # Configurações do Firebase Hosting
├── angular.json     # Configurações do Angular CLI
└── package.json
```

---

## 📦 Build para produção

```bash
ng build
```

Os arquivos serão gerados na pasta `dist/`. Para fazer deploy no Firebase Hosting:

```bash
firebase deploy
```

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para abrir uma _issue_ ou enviar um _pull request_.

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

<p align="center">Feito com ❤️ por <a href="https://github.com/geilsoncarvalho2006-dev">Geilson Carvalho</a></p>
