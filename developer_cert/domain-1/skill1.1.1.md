# Skill 1.1.1 - Describe architectural patterns

**Exam guide:** DVA-C02  
**Domain 1:** Development with AWS Services  
**Task 1:** Develop code for applications hosted on AWS  
**Scope:** Event-driven, microservices, monolithic, choreography, orchestration, and fanout.

## 1. Study material

### Start here: these patterns can coexist

The terms in this skill answer different questions:

| Question | Relevant patterns |
| --- | --- |
| How is application functionality packaged and deployed? | Monolithic, microservices |
| How does the application react to changes? | Event-driven |
| Who decides the next step in a business workflow? | Choreography, orchestration |
| How does one message reach multiple independent consumers? | Fanout |

A microservices application can use events, orchestrate payments, and fan out notifications. A monolith can also publish events. Recognize the requirement before choosing a pattern.

### A. Monolithic architecture

A monolith deploys its main application functionality as one unit. A **modular monolith** keeps clear internal modules while deploying them together.

Example: product, inventory, and order modules live inside one API application. Changing the order module requires deploying that API again.

**Advantages:** simple local development, fewer network boundaries, and easier transactions inside one database. **Trade-offs:** modules share a release cycle, and scaling one feature generally means scaling the whole deployment unit.

A monolith can run as multiple replicas behind a load balancer. It does not mean one server or an application that cannot scale.

### B. Microservices architecture

Microservices divide business capabilities into services that can be deployed independently. For example, catalog and payments could have separate releases and scaling policies.

**Advantages:** independent delivery and scaling. **Trade-offs:** network failures, distributed tracing, API compatibility, and data consistency become harder to manage.

Services typically own their data and expose contracts rather than letting others directly modify their tables. Independent services do not require a separate physical database server each.

Running several containers does not automatically make an application microservices. Look for business boundaries and independent deployment.

**Project connection:** our chosen design is a modular monolith plus a worker. We can learn messaging without splitting every module into a service.

Source: [AWS comparison of monolithic and microservices architectures](https://aws.amazon.com/compare/the-difference-between-monolithic-and-microservices-architecture/).

### C. Event-driven architecture

An **event** records something that happened, such as `OrderPlaced`. A producer publishes it, and interested consumers react, often through a broker or event bus.

```text
Order API --> EventBridge --> Notification handler
                         --> Analytics handler
```

The producer need not call each consumer directly. New consumers can react without adding another downstream API call to the producer.

**Benefits:** reduced coupling and independent processing. **Trade-offs:** results may become visible later, and tracing a business operation across consumers takes more work.

Consumers must handle the actual delivery contract: duplicates, retries, and ordering depend on the services and configuration. Publishing an event does not make downstream side effects exactly-once.

An **event** says `OrderPlaced`; a **command** requests `ReserveInventory`. The distinction is intent, not whether the payload is JSON or travels through a queue.

Source: [AWS event-driven architecture overview](https://aws.amazon.com/event-driven-architecture/).

### D. Choreography and orchestration

Both coordinate work across components; they differ in where workflow decisions live.

**Choreography:** participants react to events and publish new events. There is no central controller deciding every business step.

```text
OrderPlaced --> Inventory reserves stock --> InventoryReserved
InventoryReserved --> Payment charges customer --> PaymentCompleted
PaymentCompleted --> Shipping creates shipment
```

An event bus transports events; its presence does not by itself make it a workflow orchestrator. Choreography suits independent reactions, but a long chain becomes harder to understand and troubleshoot.

**Orchestration:** a coordinator explicitly decides the sequence, branches, and failure handling. AWS Step Functions is a common choice.

```text
Step Functions: reserve stock --> charge payment --> create shipment
                                     |
                                  failure
                                     v
                               release stock
```

Orchestration makes workflow progress explicit, but the coordinator must evolve when the workflow changes. It can invoke asynchronous work; orchestration does not require synchronous HTTP calls.

A **saga** coordinates local transactions across services. On failure, compensation performs business actions such as releasing stock or refunding payment. This is not one database rollback across all services, and compensation can itself fail. Sagas can use either choreography or orchestration.

Source: [AWS saga patterns](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/saga-patterns.html).

### E. Fanout

Fanout distributes one published message to multiple independent recipients.

Suppose each order must reach email, analytics, and fraud processing. A common pattern is one SNS topic with a separate SQS queue for each consumer:

```text
                         +--> Email queue --> Email worker
Order API --> SNS topic -+--> Analytics queue --> Analytics worker
                         +--> Fraud queue --> Fraud worker
```

Each queue buffers its consumer's work independently. A slow analytics worker does not consume the email worker's copy.

**Critical distinction:** three workers polling one SQS queue compete for work; that setup does not intentionally deliver every message to all three. Standard queues can also redeliver messages, so consumers still need duplicate handling.

SNS subscription filters can select which messages reach each subscriber. Fanout does not require every subscriber to receive every publication when filters are configured.

Source: [AWS SNS-to-SQS fanout](https://docs.aws.amazon.com/sns/latest/dg/sns-sqs-as-subscriber.html).

### Recognizing AWS services in questions

| Requirement | Typical fit |
| --- | --- |
| Buffer work until a consumer can process it | SQS |
| Publish to several independent subscribers | SNS |
| Route events based on event contents | EventBridge event bus rules |
| Coordinate steps, decisions, retries, and error paths | Step Functions |

These are starting points, not exclusive rules. Requirements can justify combinations such as EventBridge routing to separate SQS queues.

Reference: [AWS serverless service decision guide](https://docs.aws.amazon.com/decision-guides/latest/decision-guides/choosing-aws-serverless-service.html).

### What to remember for the exam

- **Deploy together:** think monolith. **Deploy business services independently:** think microservices.
- **React to a fact:** think event-driven. **Coordinator directs steps:** think orchestration.
- **Participants react without a central workflow controller:** think choreography.
- **Each independent consumer needs its own copy:** think fanout, with separate queues when buffering is required.
- Microservices can still be tightly coupled through synchronous call chains or coordinated releases.
- More services do not automatically produce better reliability; choose the pattern that meets the stated requirement.

## 2. Five practice questions

These are original practice scenarios, not actual AWS exam questions. Choose one answer unless instructed otherwise.

### Question 1

A small team maintains catalog, inventory, and order modules in one API deployment. It runs four identical API tasks behind an ALB. All modules are released together. Which description fits best?

A. Microservices, because four tasks run independently  
B. A modular monolith with multiple replicas  
C. Choreography, because the load balancer distributes requests  
D. Fanout, because the ALB sends each request to every task

### Question 2

An order workflow must reserve inventory, charge payment, and arrange shipping. The team needs a central view of the current step, explicit retries, and a stock-release action if payment fails. Which approach best matches these requirements?

A. Publish an event and let every service decide the entire workflow independently  
B. Put all steps on one queue and assume delivery order enforces the business process  
C. Use Step Functions to orchestrate the workflow and its failure paths  
D. Use an SNS topic as the workflow state store

### Question 3

Every new order must be processed independently by email and analytics. Either consumer may be offline temporarily and must catch up later. Which two choices together meet this requirement? **Choose TWO.**

A. Publish order messages to an SNS topic  
B. Subscribe separate email and analytics SQS queues to the topic  
C. Run both consumers against one SQS queue so each gets every message  
D. Have SNS synchronously wait for both consumers to finish the business work  
E. Delete messages as soon as the publisher sends them, before processing

### Question 4

An order service emits `OrderPlaced`. Inventory reacts and emits `InventoryReserved`. Payments reacts to that event and emits `PaymentCompleted`. No component defines the whole sequence. What coordination pattern is this?

A. Orchestration  
B. Monolithic deployment  
C. Competing consumers  
D. Choreography

### Question 5

A modular monolith publishes `OrderPlaced` events to EventBridge. Later, a reporting consumer is added using a new event rule without changing the publisher. Which statement is most accurate?

A. Publishing events automatically converts the monolith into microservices  
B. Monolithic deployment and event-driven communication can coexist  
C. EventBridge guarantees each reporting side effect happens exactly once  
D. Event-driven communication requires a Step Functions workflow

## 3. Answers and explanations

<details>
<summary>Open after answering all five questions</summary>

### Question 1 - B

The modules share one deployment unit; four running copies are replicas of that unit.

- **A:** replica count does not create independently deployable business services.
- **C:** load balancing is request distribution, not coordination through business events.
- **D:** an ALB normally routes a request to a selected target; it does not broadcast it to every replica.

### Question 2 - C

Step Functions makes sequencing, workflow progress, retries, and failure handling explicit. Releasing reserved inventory is a compensating business action.

- **A:** independent event reactions are choreography and do not meet the requested central workflow model.
- **B:** a queue provides message transport and buffering; it does not define the complete workflow. Even ordering alone would not implement branches or compensation.
- **D:** SNS distributes messages; it is not a business workflow state store.

### Question 3 - A and B

SNS fans out publications to separate queues. Email and analytics then process their own buffered copies at their own pace.

- **C:** consumers of one queue compete for messages; each consumer is not promised its own copy.
- **D:** publishing a notification is not synchronous completion of subscriber business work.
- **E:** deleting before successful processing risks losing unfinished work.

### Question 4 - D

Each participant reacts to a predecessor's event and publishes another. Workflow behavior is distributed among participants.

- **A:** orchestration requires a coordinator directing the workflow.
- **B:** the scenario describes communication, not a shared application deployment unit.
- **C:** competing consumers share queue work; this example describes a chain of different business reactions.

### Question 5 - B

Deployment boundaries and communication patterns are separate dimensions. The API can remain a monolith while downstream consumers react to its events.

- **A:** emitting events does not split internal modules into independently deployable services.
- **C:** event delivery does not guarantee exactly-once business side effects. Consumers must handle duplicates appropriately.
- **D:** event-driven applications can use event rules and consumers without a central orchestrator.

</details>

## 4. Extended learning

### Selected official reading

Use these to clarify a weak area rather than reading everything before attempting the questions:

| Resource | Focus |
| --- | --- |
| [Monolithic versus microservices](https://aws.amazon.com/compare/the-difference-between-monolithic-and-microservices-architecture/) | Deployment boundaries, scaling, and operational trade-offs |
| [Event-driven architecture](https://aws.amazon.com/event-driven-architecture/) | Producers, consumers, and decoupling |
| [Saga patterns](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/saga-patterns.html) | Coordination and compensation across services |
| [SNS-to-SQS fanout](https://docs.aws.amazon.com/sns/latest/dg/sns-sqs-as-subscriber.html) | Independent copies and buffering for subscribers |
| [Choosing an AWS serverless service](https://docs.aws.amazon.com/decision-guides/latest/decision-guides/choosing-aws-serverless-service.html) | Mapping queues, pub/sub, event buses, and orchestration to AWS services |

### Optional paper exercise - no AWS resources required

Imagine adding fraud screening to our order platform:

1. Draw a flow where fraud screening is an independent observer and does not block order acceptance.
2. Draw another where payment must wait for a fraud decision, with explicit timeout and rejection paths.
3. Explain why fanout suits the first requirement and orchestration may suit the second.
4. Explain what should happen if the same order event arrives twice.

This exercise checks whether you can connect the pattern to the business requirement. It does not require splitting our project into microservices or deploying additional infrastructure.
