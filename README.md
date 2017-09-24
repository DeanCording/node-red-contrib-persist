# node-red-contrib-persist
A Node Red node set to persist data over Node Red restarts and deploys.


This node set consists of input nodes to record messages, persistent store configuration node which buffers the messages and writes them to the filesystem at regualr intervals, and output nodes which replay the last message saved when Node Red restarts or is deployed.

A message stored by an input node is saved under the name of that node.  Only the last message received is saved, irrespective of its topic.   The message is replayed by the output node with the same name when it is triggered.  Output nodes are triggered on startup, after deploys, on receipt of any message, or when the button on the node is pressed in the Node Red console.

Messages are stored in an internal buffer until flushed to the filesystem.  The buffer is flushed no more frequently than the interval specified in the persistence store configuration node.  Messages received within the flush interval are discarded, except for the last message received.  If no message is received within the flush interval, the next message received will trigger a flush.  Setting a large flush interval will reduce filesystem writes but will increase the risk of data loss.  The buffer is flushed when Node Red is shutdown.

This node set was written in particular to persist data used in the Dashboard graphs.  The graph nodes output their entire current data set for each new input received.  This output can be persisted and fed back to the graph node on startup or deploy.

