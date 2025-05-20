CREATE TABLE user (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    active INTEGER DEFAULT 1, -- 1 for TRUE, 0 for FALSE
    createTime INTEGER,
    updateTime INTEGER
);

CREATE TABLE inbox (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    messageId TEXT, -- From original email, if available
    fromAddress TEXT,
    fromName TEXT,
    toAddress TEXT, -- Recipient email address associated with this mailbox
    subject TEXT,
    text TEXT,
    html TEXT,
    date INTEGER, -- Original email date as Unix timestamp
    attachments TEXT, -- JSON array of attachment metadata
    receivedDate INTEGER DEFAULT (STRFTIME('%s', 'now')) -- Timestamp of when the record was inserted
);

CREATE TABLE sent (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fromAddress TEXT, -- User sending the email
    toAddress TEXT, -- Recipient email address
    subject TEXT,
    text TEXT, -- Original plain text/markdown content
    html TEXT, -- Rendered HTML content
    date INTEGER, -- Sent date as Unix timestamp
    attachments TEXT -- JSON array of attachment metadata
);
