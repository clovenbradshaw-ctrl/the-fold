import time


def countdown(t):
    while t:
        mins, secs = divmod(t, 60)
        print(f"{mins:02d}:{secs:02d}", end="\r")
        time.sleep(1)
        t -= 1
    print("Time's up!")


duration = int(input("Enter countdown duration in seconds: "))
countdown(duration)
