package com.example.blog.service;

import com.example.blog.common.CurrentUser;
import com.example.blog.dto.PostRequest;
import com.example.blog.entity.Post;
import com.example.blog.exception.BusinessException;
import com.example.blog.mapper.PostMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Service
public class PostService {
    private static final int DRAFT = 0;
    private static final int PUBLISHED = 1;

    private final PostMapper postMapper;

    public PostService(PostMapper postMapper) {
        this.postMapper = postMapper;
    }

    public List<Post> listPublished() {
        return postMapper.findPublished();
    }

    public Post getPublished(Long id) {
        Post post = postMapper.findPublishedById(id);
        if (post == null) {
            throw new BusinessException("文章不存在或未发布");
        }
        return post;
    }

    public List<Post> listMine(CurrentUser currentUser) {
        return postMapper.findByAuthorId(currentUser.id());
    }

    @Transactional
    public Post create(PostRequest request, CurrentUser currentUser) {
        validatePost(request);
        Post post = new Post();
        post.setAuthorId(currentUser.id());
        fillPost(post, request);
        postMapper.insert(post);
        saveTags(post.getId(), normalizeTags(request.tags()));
        return postMapper.findById(post.getId());
    }

    @Transactional
    public Post update(Long id, PostRequest request, CurrentUser currentUser) {
        validatePost(request);
        Post post = new Post();
        post.setId(id);
        post.setAuthorId(currentUser.id());
        fillPost(post, request);
        if (postMapper.updateByAuthor(post) == 0) {
            throw new BusinessException("文章不存在，或你无权修改");
        }
        saveTags(id, normalizeTags(request.tags()));
        return postMapper.findById(id);
    }

    @Transactional
    public void delete(Long id, CurrentUser currentUser) {
        if (postMapper.deleteByAuthor(id, currentUser.id()) == 0) {
            throw new BusinessException("文章不存在，或你无权删除");
        }
    }

    private void fillPost(Post post, PostRequest request) {
        post.setTitle(request.title().trim());
        post.setContent(request.content().trim());
        post.setSummary(StringUtils.hasText(request.summary()) ? request.summary().trim() : buildSummary(request.content()));
        post.setStatus(request.status() == null ? PUBLISHED : request.status());
    }

    private void validatePost(PostRequest request) {
        if (!StringUtils.hasText(request.title())) {
            throw new BusinessException("标题不能为空");
        }
        if (!StringUtils.hasText(request.content())) {
            throw new BusinessException("内容不能为空");
        }
        if (request.status() != null && request.status() != DRAFT && request.status() != PUBLISHED) {
            throw new BusinessException("文章状态只能是 0 草稿或 1 发布");
        }
    }

    private void saveTags(Long postId, List<String> tags) {
        postMapper.deleteTagsByPostId(postId);
        for (String tag : tags) {
            postMapper.insertTagIfAbsent(tag);
            postMapper.insertPostTag(postId, tag);
        }
    }

    private List<String> normalizeTags(List<String> tags) {
        if (tags == null || tags.isEmpty()) {
            return List.of();
        }
        Set<String> normalized = new LinkedHashSet<>();
        for (String tag : tags) {
            if (!StringUtils.hasText(tag)) {
                continue;
            }
            String trimmed = tag.trim();
            if (trimmed.length() > 50) {
                throw new BusinessException("标签长度不能超过 50 个字符");
            }
            normalized.add(trimmed);
        }
        return new ArrayList<>(normalized);
    }

    private String buildSummary(String content) {
        String text = content.trim();
        return text.length() <= 120 ? text : text.substring(0, 120);
    }
}
