#!/usr/bin/env python3
# pty-exec.py — run one shell command under a real PTY and relay it.
#
# serve.mjs spawns this for every terminal command. The PTY is what makes
# interactive programs behave like they do in a terminal: python and node get
# prompts, pip gets its live progress, and EOF/keyboard signals land where a
# real terminal would put them. Both streams of the command come back merged
# on stdout (that is how a pty works); stdin relays into the pty master.
#
# The parent ignores SIGINT — the server signals the process GROUP, and the
# child (zsh and whatever it runs) is the thing that should see it, not this
# relay. The exit code rides out in a 5-byte trailer: b"FOLD" + one byte.

import os
import pty
import select
import signal
import sys


def main():
    command = sys.argv[1] if len(sys.argv) > 1 else ""
    signal.signal(signal.SIGINT, signal.SIG_IGN)

    pid, master = pty.fork()
    if pid == 0:
        os.execvp("/bin/zsh", ["/bin/zsh", "-lc", command])

    try:
        while True:
            r, _, _ = select.select([master, 0], [], [], 60)
            for src in r:
                if src == master:
                    try:
                        data = os.read(master, 4096)
                    except OSError:
                        data = b""
                    if not data:
                        return
                    sys.stdout.buffer.write(data)
                    sys.stdout.buffer.flush()
                else:
                    try:
                        data = os.read(0, 4096)
                    except OSError:
                        data = b""
                    if data:
                        os.write(master, data)
    finally:
        try:
            os.close(master)
        except OSError:
            pass
        code = 0
        try:
            # Reap without hanging: a command that backgrounded itself and
            # left the pty should not wedge the terminal forever.
            for _ in range(20):
                got, status = os.waitpid(pid, os.WNOHANG)
                if got == pid:
                    code = os.waitstatus_to_exitcode(status) if hasattr(os, "waitstatus_to_exitcode") else status
                    break
                import time

                time.sleep(0.1)
        except ChildProcessError:
            pass
        sys.stdout.buffer.write(b"\x1b]0;fold-exit:%s\x1b\\" % str(code).encode())
        sys.stdout.buffer.flush()


if __name__ == "__main__":
    main()
