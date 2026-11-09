---
layout: doc
title: Sample Flow
part: Components
chapter: SRP
menu: components/srp
component: srp
---

This page runs the full SRP flow in one script: registration, login
hello, authenticate, and the optional client check. The server and the
client run in the same process here, so you can see every value passed
between them. In a real application, each step runs in a separate
request, and the values are stored and sent as described in
[Protocol](./protocol).

```php
use Windwalker\SRP\SRPClient;
use Windwalker\SRP\SRPServer;

$server = SRPServer::create();
$client = SRPClient::create();

$identity = 'alice@example.com';
$password = 'my-secret-password';

// Registration: the client sends salt and verifier only.
$pf = $client->register($identity, $password);

$salt = $pf->salt;
$verifier = $pf->verifier;

// Store identity, salt, and verifier in the user record.
// Use toBase(16) if you save them as hex strings.
$saltHex = $salt->toBase(16);
$verifierHex = $verifier->toBase(16);
```

Login starts with the hello request. The server reads the stored salt
and verifier, and generates `b` and `B`:

```php
// Hello: the server loads salt and verifier from storage.
$r = $server->step1($identity, $salt, $verifier);

// Keep $b in the session, not in the response.
$b = $r->secret;
$B = $r->public;

// Respond with salt and B.
```

The client receives `salt` and `B`, then computes its values:

```php
$cr = $client->step1($identity, $password, $salt);

$a = $cr->secret;
$A = $cr->public;
$x = $cr->hash;

$cp = $client->step2($identity, $salt, $A, $a, $B, $x);

$K = $cp->key;
$M1 = $cp->proof;
```

The client sends `identity`, `A`, and `M1` to the server. The server
verifies the proof, and returns `M2`:

```php
// Authenticate: the server loads $b and $B from the session.
$sp = $server->step2(
    $identity,
    $salt,
    $verifier,
    $A,
    $B,
    $b,
    $M1,
);

$M2 = $sp->proof;

// Clear $b and $B from the session now.
```

Finally, the client checks `M2`. This step is optional:

```php
$client->step3($A, $K, $M1, $M2);

// No exception means the server proved it knows the verifier.
echo "Login succeeded.";
```

## Reading the Result

Each step returns a result object:

- `EphemeralResult`: `secret` and `public` values, and the password
  hash `x` on the client step 1. Returned by `step1()`.
- `ProofResult`: `key` (`K`), `proof` (`M1` on the client, `M2` on the
  server), and `preMasterSecret` (`S`). Returned by `step2()`.
- `PasswordFile`: `salt` and `verifier`. Returned by `register()`.

::: warning
Discard `$a`, `$b`, and `$S` after the flow completes. Keep only the
session key `$K` if your application needs one, and handle it as a
secret.
:::
