create database if not exists blog_temp
    default character set utf8mb4
    collate utf8mb4_unicode_ci;

use blog_temp;

create table if not exists users (
    id bigint primary key auto_increment,
    username varchar(50) not null unique,
    password_hash varchar(100) not null,
    nickname varchar(50) not null,
    created_at datetime not null default current_timestamp,
    updated_at datetime not null default current_timestamp on update current_timestamp
) engine = InnoDB default charset = utf8mb4;

create table if not exists posts (
    id bigint primary key auto_increment,
    author_id bigint not null,
    title varchar(200) not null,
    content text not null,
    summary varchar(300),
    status tinyint not null default 1 comment '0=草稿, 1=发布',
    created_at datetime not null default current_timestamp,
    updated_at datetime not null default current_timestamp on update current_timestamp,
    constraint fk_posts_author foreign key (author_id) references users (id) on delete cascade,
    index idx_posts_status_created_at (status, created_at),
    index idx_posts_author_created_at (author_id, created_at)
) engine = InnoDB default charset = utf8mb4;

create table if not exists tags (
    id bigint primary key auto_increment,
    name varchar(50) not null unique,
    created_at datetime not null default current_timestamp
) engine = InnoDB default charset = utf8mb4;

create table if not exists post_tags (
    post_id bigint not null,
    tag_id bigint not null,
    created_at datetime not null default current_timestamp,
    primary key (post_id, tag_id),
    constraint fk_post_tags_post foreign key (post_id) references posts (id) on delete cascade,
    constraint fk_post_tags_tag foreign key (tag_id) references tags (id) on delete cascade,
    index idx_post_tags_tag_id (tag_id)
) engine = InnoDB default charset = utf8mb4;
