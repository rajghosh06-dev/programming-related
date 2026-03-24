CC = gcc
CFLAGS = -Wall
TARGET = page_replacement

SRCS = main.c fifo.c lru.c optimal.c lfu.c utils.c
OBJS = $(SRCS:.c=.o)

all: $(TARGET)

$(TARGET): $(OBJS)
	$(CC) $(CFLAGS) -o $(TARGET) $(OBJS)

clean:
	rm -f $(OBJS) $(TARGET)

run: $(TARGET)
	./$(TARGET)

