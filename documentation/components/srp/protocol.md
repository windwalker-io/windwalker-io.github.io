---
layout: doc
title: Protocol
part: Components
chapter: SRP
menu: components/srp
component: srp
---

SRP is a challenge-response protocol. Both sides contribute random
secret values, and each proves to the other that it knows the shared
secret, without any password or secret leaving its side. Understanding
which values are sent and which are kept secret is necessary to use the
package safely. This page describes the protocol and the rules that
follow from it. The [Sample Flow](./sample-flow) page shows the same
steps as running code.

## The SRP Flow

The definitions and processes of SRP-6a are spread across
[RFC 2945](https://datatracker.ietf.org/doc/html/rfc2945) and
[RFC 5054](https://datatracker.ietf.org/doc/html/rfc5054). Follow the
RFC procedures strictly, without custom changes. Do not transmit any
value that the protocol does not require. Even values the other side
ignores count as a protocol violation.

## Definitions

| Variable        | Name                                                                | Send | Calc                                           |
|-----------------|---------------------------------------------------------------------|------|------------------------------------------------|
| `I`, `identity` | The main identity (username or email).                              | C=>S |                                                |
| `N`             | A large safe prime. All arithmetic is done modulo N.                | X    |                                                |
| `g`             | A generator modulo N.                                               | X    |                                                |
| `k`             | Multiplier parameter.                                               | X    | Configured as `key`.                           |
| `s`             | The user salt.                                                      | C<=S | `random()`                                     |
| `v`             | Password verifier.                                                  | X    | `g^x % N`                                      |
| `x`             | The hash of salt, identity, and password.                           | X    | `H(s \| H(I \| ":" \| P))`                     |
| `a`, `b`        | Client and server secret keys.                                      | X    | `random()`                                     |
| `A`             | Client public key.                                                  | C=>S | `g^a % N`                                      |
| `B`             | Server public key.                                                  | C<=S | `k*v + g^b % N`                                |
| `u`             | Prevents an attacker who learns a user's verifier from using it.    | X    | `H(PAD(A) \| PAD(B))`                          |
| `S` (client)    | Pre-master secret (the shared secret).                              | X    | `(B - (k * g^x)) ^ (a + (u * x)) % N`          |
| `S` (server)    | Pre-master secret (the shared secret).                              | X    | `(A * v^u) ^ b % N`                            |
| `K`             | The session key hash, used to generate M.                           | X    | `H(S)`                                         |
| `M1`            | Evidence message 1, verifies that both sides derived the same key.  | C=>S | `H(H(N) XOR H(g) \| H(I) \| s \| A \| B \| K)` |
| `M2`            | Evidence message 2, verifies that both sides derived the same key.  | C<=S | `H(A \| M1 \| K)`                              |

The `Send` column shows the direction of each value: `C=>S` is sent from
the client to the server, `C<=S` from the server to the client, and `X`
is never sent.

## Registration

![Registration](https://github.com/windwalker-io/srp/assets/1639206/9cfe047e-6baa-4208-bfde-59cbe501303a)

When an app (web or mobile) starts the registration flow, it shows an
`identity` (`I`, a username or email) and a `password` (`P`) field. The
SRP client generates a random `salt` (`s`) and a password `verifier`
(`v`), computed from the salt, identity, and password.

```php
use Windwalker\SRP\SRPClient;

$client = SRPClient::create();

$pf = $client->register($identity, $password);

$salt = $pf->salt; // BigInteger
$verifier = $pf->verifier; // BigInteger
```

The app sends only the `salt`, the `verifier`, and the `identity` to the
server. It does not send the `password`.

::: warning
Never send the raw password to the server, even if the server ignores
it. Sending it is a protocol violation and a security bug.
:::

The server can store the identity, `salt`, and `verifier` in its
database. You may encrypt the `salt` and `verifier` before saving them,
but only with a key that the server alone knows.

## Login

![Login](https://github.com/windwalker-io/srp/assets/1639206/a01b4d82-2c28-4d95-8615-dca38408c2d5)

Login takes two requests, the hello and the authenticate request. The
client can then run an optional check on its own.

### Hello and Server Step 1

When a user starts a login, they enter their identity and password, and
the client sends a hello request with the `identity` to the server. The
server looks up the user, reads `salt` and `verifier` from its user
data, and runs step 1. This generates a random private `b` and a public
`B`:

```php
use Windwalker\SRP\SRPServer;

$server = SRPServer::create();

$r = $server->step1($identity, $salt, $verifier);

$b = $r->secret; // Keep it on the server.
$B = $r->public; // Send to the client, with $salt.
```

The server must store `b` and `B` in a session, cache, or database, so
that they are available in the next step. The server returns `salt` and
`B` to the client. This exchange is similar to a handshake that creates
a connected session for both sides.

::: warning
Keep `b` on the server, and never send it to the client. Clear it after
the authenticate step.
:::

Some packages call the hello request a `challenge` action. In that case,
`B` is the server challenge value.

### Client Steps 1 and 2

After receiving `B` and `salt`, the client runs step 1 to generate `a`
and `A`, then runs step 2 to generate the client proof `M1`:

```php
$cr = $client->step1($identity, $password, $salt);

$a = $cr->secret; // Keep it on the client.
$A = $cr->public;
$x = $cr->hash;

$cp = $client->step2($identity, $salt, $A, $a, $B, $x);

$K = $cp->key;
$M1 = $cp->proof;
```

The client sends `A` and `M1` to the server, with the identity. The
server runs step 2 with the stored `salt` and `verifier`, and the `b`
and `B` values from the session. It generates its own `M1` and compares
it with the client's value:

```php
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
```

If the proofs do not match, the server throws
`Windwalker\SRP\Exception\InvalidSessionProofException` and the login
fails. If they match, the server returns `M2` to the client, and the
authenticate step is complete. The client can redirect the user to the
login success page.

::: warning
Clear `a`, `b`, and their session copies after each login attempt. A
secret used twice weakens the protocol. Do not reuse them across
attempts.
:::

### Client Step 3 (Optional)

The client can verify `M2`. This confirms that the server is trusted
and that both sides derived the same session key `S`. If the check
passes, the handshake is complete and mutual authentication has
succeeded. The client throws `InvalidSessionProofException` when the
check fails.

```php
$client->step3($A, $K, $M1, $M2);
```

Redirect the user after this step if you use it.

### About `S` and `M`

Client and server each compute the pre-master secret `S`. The two values
are equal even though neither side sends `S` to the other. The proofs
`M1` and `M2` confirm this without revealing `S`.

Because both sides hold the same `S`, you can use it, or the derived key
`K`, as a trusted session key or as the basis for further cryptography.

## Operational Rules

- You do not need AJAX to run the SRP flow. Form posts work for every
  step. For example, you can split the username and password into two
  steps on a website and keep the values in hidden inputs. Store `a` and
  `b` only on the side that owns them, in a browser or server cache that
  survives between steps, and never send them to the other side.
- The `verifier` depends on both the identity and the password. Create a
  new verifier and replace the old one whenever the user changes either
  of them.
- Send only the values that the protocol requires. Extra values give an
  attacker more data, even when the receiver ignores them.
- Clear all values when an authenticate process restarts. Reloading the
  page resets the values held in JavaScript. In a single-page app, wrap
  the whole process in a function, do not store values in object
  properties, and create a new client object for each attempt.

::: warning
SRP does not replace HTTPS. Serve every step over TLS, and set the
`HttpOnly` and `Secure` flags on session cookies. Without TLS, a
man-in-the-middle attacker can read and reuse the values that the
protocol sends.
:::
